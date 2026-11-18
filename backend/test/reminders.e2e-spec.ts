import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DateTime } from 'luxon';
import { AppModule } from '../src/app.module';
import { RemindersService } from '../src/modules/reminders/reminders.service';
import { Notification, NotificationType } from '../src/modules/notifications/entities/notification.entity';
import { Booking, BookingStatus } from '../src/modules/bookings/entities/booking.entity';

describe('Reminders Service & Atomicity Test (E2E)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let remindersService: RemindersService;
  let testUserId: string;
  let testRoomId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);
    remindersService = moduleFixture.get<RemindersService>(RemindersService);

    // Verify connected database ends with _test_db
    const dbCheck = await dataSource.query('SELECT current_database() AS db_name');
    const dbName = dbCheck[0]?.db_name;
    if (!dbName || !dbName.endsWith('_test_db')) {
      throw new Error(`CRITICAL: E2E test connected to non-test database "${dbName}".`);
    }

    // Create or get a dedicated user and room for reminder tests
    const testEmail = `reminder_${Date.now()}@company.com`;
    const user = await dataSource.query(`
      INSERT INTO users (full_name, email, password_hash, role)
      VALUES ('Reminder Test User', '${testEmail}', 'dummyhash', 'EMPLOYEE')
      RETURNING id;
    `);
    testUserId = user[0].id;

    const room = await dataSource.query(`
      INSERT INTO rooms (name, floor_or_location, capacity, accent_color)
      VALUES ('Reminder Room', '1st Floor', 8, '#7C6CFF')
      RETURNING id;
    `);
    testRoomId = room[0].id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('claims booking starting within reminder window, sends exactly 1 notification, and prevents duplicates on rerun', async () => {
    // Current time + 14 minutes (reminder is 15 minutes before)
    const now = new Date();
    const startTime = new Date(now.getTime() + 14 * 60 * 1000);
    const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);

    // Insert booking directly into DB (bypassing future 30-min boundary for test speed)
    const bookingRes = await dataSource.query(`
      INSERT INTO bookings (room_id, user_id, title, attendee_count, start_time, end_time, status, reminder_minutes_before)
      VALUES ('${testRoomId}', '${testUserId}', 'Imminent Standup', 2, '${startTime.toISOString()}', '${endTime.toISOString()}', 'CONFIRMED', 15)
      RETURNING id;
    `);
    const bookingId = bookingRes[0].id;

    // 1. Run reminder processor directly
    const claimedCount = await remindersService.processReminders();
    expect(claimedCount).toBeGreaterThanOrEqual(1);

    // Verify exactly one notification was created
    const notifs = await dataSource.getRepository(Notification).find({
      where: {
        userId: testUserId,
        bookingId,
        type: NotificationType.BOOKING_REMINDER,
      },
    });
    expect(notifs.length).toBe(1);
    expect(notifs[0].message).toContain('starts in approximately 15 minutes');

    // Verify reminder_sent_at is set
    const updatedBooking = await dataSource.getRepository(Booking).findOne({ where: { id: bookingId } });
    expect(updatedBooking?.reminderSentAt).toBeDefined();
    expect(updatedBooking?.reminderSentAt).not.toBeNull();

    // 2. Run reminder processor again immediately
    const rerunClaimedCount = await remindersService.processReminders();
    // Must NOT claim the same booking again!
    const notifsAfterRerun = await dataSource.getRepository(Notification).find({
      where: {
        userId: testUserId,
        bookingId,
        type: NotificationType.BOOKING_REMINDER,
      },
    });
    expect(notifsAfterRerun.length).toBe(1); // Still exactly one!
  });

  it('cancelled bookings NEVER produce reminders', async () => {
    const now = new Date();
    const startTime = new Date(now.getTime() + 12 * 60 * 1000);
    const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);

    const bookingRes = await dataSource.query(`
      INSERT INTO bookings (room_id, user_id, title, attendee_count, start_time, end_time, status, reminder_minutes_before)
      VALUES ('${testRoomId}', '${testUserId}', 'Cancelled Meeting Ahead', 2, '${startTime.toISOString()}', '${endTime.toISOString()}', 'CANCELLED', 15)
      RETURNING id;
    `);
    const cancelledBookingId = bookingRes[0].id;

    await remindersService.processReminders();

    const notifs = await dataSource.getRepository(Notification).find({
      where: {
        userId: testUserId,
        bookingId: cancelledBookingId,
        type: NotificationType.BOOKING_REMINDER,
      },
    });
    expect(notifs.length).toBe(0);
  });
});
