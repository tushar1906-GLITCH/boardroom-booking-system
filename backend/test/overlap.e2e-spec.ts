import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as cookieParser from 'cookie-parser';
import { DataSource } from 'typeorm';
import { DateTime } from 'luxon';
import { AppModule } from '../src/app.module';

describe('Mandatory Overlap Prevention Suite (E2E & PostgreSQL GiST)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let adminToken: string;
  let employee1Token: string;
  let employee2Token: string;
  let employee1Id: string;
  let employee2Id: string;
  let roomAId: string;
  let roomBId: string;

  const OFFICE_TZ = 'Asia/Kolkata';

  // Helper to construct future slot aligned to 30-min boundary on next Monday
  const getSlot = (hour: number, minute: number, durationMinutes: number) => {
    let dt = DateTime.now().setZone(OFFICE_TZ).plus({ days: 10 });
    // Pick a Monday (1)
    while (dt.weekday !== 1) {
      dt = dt.plus({ days: 1 });
    }
    const start = dt.set({ hour, minute, second: 0, millisecond: 0 });
    const end = start.plus({ minutes: durationMinutes });
    return {
      startTime: start.toISO()!,
      endTime: end.toISO()!,
    };
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
    dataSource = moduleFixture.get<DataSource>(DataSource);

    // Verify connected database ends with _test_db before truncating
    const dbCheck = await dataSource.query('SELECT current_database() AS db_name');
    const dbName = dbCheck[0]?.db_name;
    if (!dbName || !dbName.endsWith('_test_db')) {
      throw new Error(`CRITICAL: E2E test connected to non-test database "${dbName}". Aborting TRUNCATE.`);
    }

    // Clean test database tables
    await dataSource.query(`
      TRUNCATE TABLE notifications, bookings, rooms, refresh_tokens, users RESTART IDENTITY CASCADE;
    `);

    // Register Admin
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Admin User',
        email: 'admin_test@company.com',
        password: 'Password@123',
        department: 'Operations',
      });

    // Elevate admin directly in DB for testing
    await dataSource.query(`UPDATE users SET role = 'ADMIN' WHERE email = 'admin_test@company.com'`);

    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin_test@company.com', password: 'Password@123' });
    adminToken = adminLogin.body.accessToken;

    // Register Employee 1
    const emp1Res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Employee One',
        email: 'emp1_test@company.com',
        password: 'Password@123',
      });
    employee1Token = emp1Res.body.accessToken;
    employee1Id = emp1Res.body.user.id;

    // Register Employee 2
    const emp2Res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Employee Two',
        email: 'emp2_test@company.com',
        password: 'Password@123',
      });
    employee2Token = emp2Res.body.accessToken;
    employee2Id = emp2Res.body.user.id;

    // Create Room A & Room B
    const rA = await request(app.getHttpServer())
      .post('/api/v1/rooms')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Overlap Test Room A',
        floorOrLocation: '1st Floor',
        capacity: 10,
        amenities: ['Whiteboard'],
        accentColor: '#7C6CFF',
      });
    roomAId = rA.body.id;

    const rB = await request(app.getHttpServer())
      .post('/api/v1/rooms')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Overlap Test Room B',
        floorOrLocation: '1st Floor',
        capacity: 10,
        amenities: ['TV Screen'],
        accentColor: '#2DD4BF',
      });
    roomBId = rB.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  let baseBookingId: string;
  const baseSlot = getSlot(10, 0, 60); // 10:00 - 11:00

  it('Base: Creates initial booking in Room A (10:00 - 11:00)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${employee1Token}`)
      .send({
        roomId: roomAId,
        title: 'Initial Team Sync',
        attendeeCount: 5,
        startTime: baseSlot.startTime,
        endTime: baseSlot.endTime,
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    baseBookingId = res.body.id;
  });

  it('(a) Exact same slot: rejects overlapping booking in Room A (10:00 - 11:00)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${employee2Token}`)
      .send({
        roomId: roomAId,
        title: 'Exact Duplicate Conflict',
        attendeeCount: 4,
        startTime: baseSlot.startTime,
        endTime: baseSlot.endTime,
      });

    expect(res.status).toBe(409);
    expect(res.body.message).toContain('already booked');
  });

  it('(b) Partial overlap start: rejects booking starting before and ending inside (09:30 - 10:30)', async () => {
    const slot = getSlot(9, 30, 60);
    const res = await request(app.getHttpServer())
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${employee2Token}`)
      .send({
        roomId: roomAId,
        title: 'Overlap Start',
        attendeeCount: 4,
        startTime: slot.startTime,
        endTime: slot.endTime,
      });

    expect(res.status).toBe(409);
    expect(res.body.message).toContain('already booked');
  });

  it('(c) Partial overlap end: rejects booking starting inside and ending after (10:30 - 11:30)', async () => {
    const slot = getSlot(10, 30, 60);
    const res = await request(app.getHttpServer())
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${employee2Token}`)
      .send({
        roomId: roomAId,
        title: 'Overlap End',
        attendeeCount: 4,
        startTime: slot.startTime,
        endTime: slot.endTime,
      });

    expect(res.status).toBe(409);
    expect(res.body.message).toContain('already booked');
  });

  it('(d) Fully contained: rejects booking completely inside existing window (10:00 - 10:30)', async () => {
    const slot = getSlot(10, 0, 30);
    const res = await request(app.getHttpServer())
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${employee2Token}`)
      .send({
        roomId: roomAId,
        title: 'Contained Conflict',
        attendeeCount: 2,
        startTime: slot.startTime,
        endTime: slot.endTime,
      });

    expect(res.status).toBe(409);
    expect(res.body.message).toContain('already booked');
  });

  it('(e) Fully containing: rejects booking that completely encompasses existing window (09:30 - 11:30)', async () => {
    const slot = getSlot(9, 30, 120);
    const res = await request(app.getHttpServer())
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${employee2Token}`)
      .send({
        roomId: roomAId,
        title: 'Encompassing Conflict',
        attendeeCount: 6,
        startTime: slot.startTime,
        endTime: slot.endTime,
      });

    expect(res.status).toBe(409);
    expect(res.body.message).toContain('already booked');
  });

  it('(f) Back-to-back bookings are ALLOWED: (11:00 - 12:00) in Room A succeeds immediately', async () => {
    const slot = getSlot(11, 0, 60); // Starts right when baseBooking ends
    const res = await request(app.getHttpServer())
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${employee2Token}`)
      .send({
        roomId: roomAId,
        title: 'Back-to-back Meeting',
        attendeeCount: 4,
        startTime: slot.startTime,
        endTime: slot.endTime,
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
  });

  it('(g) Overlapping booking in DIFFERENT room is ALLOWED: (10:00 - 11:00) in Room B succeeds', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${employee2Token}`)
      .send({
        roomId: roomBId, // Different room!
        title: 'Concurrent Meeting in Room B',
        attendeeCount: 5,
        startTime: baseSlot.startTime,
        endTime: baseSlot.endTime,
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
  });

  it('(h) Slot release: after cancelling base booking, the same slot can be booked by Employee 2', async () => {
    // 1. Employee 1 cancels base booking
    const cancelRes = await request(app.getHttpServer())
      .patch(`/api/v1/bookings/${baseBookingId}/cancel`)
      .set('Authorization', `Bearer ${employee1Token}`)
      .send({ reason: 'Releasing room for other team' });
    expect(cancelRes.status).toBe(200);

    // 2. Employee 2 books the exact same released slot in Room A
    const rebookRes = await request(app.getHttpServer())
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${employee2Token}`)
      .send({
        roomId: roomAId,
        title: 'Re-booked Slot by Employee 2',
        attendeeCount: 4,
        startTime: baseSlot.startTime,
        endTime: baseSlot.endTime,
      });

    expect(rebookRes.status).toBe(201);
    expect(rebookRes.body.status).toBe('CONFIRMED');
  });

  it('(i) Rescheduling into a conflict returns 409 and original booking remains unchanged', async () => {
    // Create Booking X at 14:00 - 15:00
    const slotX = getSlot(14, 0, 60);
    const resX = await request(app.getHttpServer())
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${employee1Token}`)
      .send({
        roomId: roomAId,
        title: 'Booking X',
        attendeeCount: 3,
        startTime: slotX.startTime,
        endTime: slotX.endTime,
      });
    expect(resX.status).toBe(201);

    // Create Booking Y at 15:00 - 16:00
    const slotY = getSlot(15, 0, 60);
    const resY = await request(app.getHttpServer())
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${employee2Token}`)
      .send({
        roomId: roomAId,
        title: 'Booking Y',
        attendeeCount: 3,
        startTime: slotY.startTime,
        endTime: slotY.endTime,
      });
    expect(resY.status).toBe(201);

    // Try to reschedule Booking Y into Booking X's slot (14:00 - 15:00)
    const conflictResched = await request(app.getHttpServer())
      .patch(`/api/v1/bookings/${resY.body.id}/reschedule`)
      .set('Authorization', `Bearer ${employee2Token}`)
      .send({
        startTime: slotX.startTime,
        endTime: slotX.endTime,
      });

    expect(conflictResched.status).toBe(409);

    // Verify Booking Y's timing was untouched
    const checkY = await request(app.getHttpServer())
      .get(`/api/v1/bookings/${resY.body.id}`)
      .set('Authorization', `Bearer ${employee2Token}`);
    expect(checkY.body.startTime).toBe(resY.body.startTime);
  });

  it('(j) Extending a booking over its own old range succeeds without self-conflict', async () => {
    // Create Booking Z at 16:00 - 17:00
    const slotZ = getSlot(16, 0, 60);
    const resZ = await request(app.getHttpServer())
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${employee1Token}`)
      .send({
        roomId: roomAId,
        title: 'Booking Z',
        attendeeCount: 3,
        startTime: slotZ.startTime,
        endTime: slotZ.endTime,
      });
    expect(resZ.status).toBe(201);

    // Extend 16:00 - 17:00 to 16:00 - 17:30 (overlaps old 16:00 - 17:00 range)
    const extendedSlot = getSlot(16, 0, 90);
    const extendRes = await request(app.getHttpServer())
      .patch(`/api/v1/bookings/${resZ.body.id}/reschedule`)
      .set('Authorization', `Bearer ${employee1Token}`)
      .send({
        startTime: extendedSlot.startTime,
        endTime: extendedSlot.endTime,
      });

    expect(extendRes.status).toBe(200);
    expect(extendRes.body.rescheduleCount).toBe(1);
  });

  it('reschedules a booking to a different room and updates the room association', async () => {
    // Create a booking in Room A at 12:00 - 13:00 (free slot)
    const slotChangeRoom = getSlot(12, 0, 60);
    const createRes = await request(app.getHttpServer())
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${employee1Token}`)
      .send({
        roomId: roomAId,
        title: 'Meeting to Switch Rooms',
        attendeeCount: 3,
        startTime: slotChangeRoom.startTime,
        endTime: slotChangeRoom.endTime,
      });
    expect(createRes.status).toBe(201);
    expect(createRes.body.roomId).toBe(roomAId);

    // Reschedule booking into Room B
    const reschedRes = await request(app.getHttpServer())
      .patch(`/api/v1/bookings/${createRes.body.id}/reschedule`)
      .set('Authorization', `Bearer ${employee1Token}`)
      .send({
        roomId: roomBId,
        startTime: slotChangeRoom.startTime,
        endTime: slotChangeRoom.endTime,
      });

    expect(reschedRes.status).toBe(200);
    expect(reschedRes.body.roomId).toBe(roomBId);
    expect(reschedRes.body.room?.id).toBe(roomBId);

    // Follow-up GET to assert persistence
    const getRes = await request(app.getHttpServer())
      .get(`/api/v1/bookings/${createRes.body.id}`)
      .set('Authorization', `Bearer ${employee1Token}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.roomId).toBe(roomBId);
    expect(getRes.body.room?.id).toBe(roomBId);
  });

  it('(k) Concurrency: 12 simultaneous requests for same room & slot yields exactly ONE 201 and 11 409s', async () => {
    const concurrentSlot = getSlot(18, 0, 60); // 18:00 - 19:00

    const requestPromises = Array.from({ length: 12 }).map((_, index) => {
      // Alternate between employee1 and employee2
      const token = index % 2 === 0 ? employee1Token : employee2Token;
      return request(app.getHttpServer())
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${token}`)
        .send({
          roomId: roomAId,
          title: `Concurrent Attempt #${index + 1}`,
          attendeeCount: 2,
          startTime: concurrentSlot.startTime,
          endTime: concurrentSlot.endTime,
        });
    });

    const responses = await Promise.all(requestPromises);

    const successResponses = responses.filter((r) => r.status === 201);
    const conflictResponses = responses.filter((r) => r.status === 409);

    expect(successResponses.length).toBe(1);
    expect(conflictResponses.length).toBe(11);

    // Verify in database that exactly ONE row exists for that time slot
    const count = await dataSource.query(`
      SELECT count(*) as count FROM bookings
      WHERE room_id = '${roomAId}'
        AND status = 'CONFIRMED'
        AND start_time = '${concurrentSlot.startTime}';
    `);
    expect(parseInt(count[0].count, 10)).toBe(1);
  });

  it('(l) Direct raw SQL INSERT of an overlapping row fails with 23P01 exclusion violation', async () => {
    const rawSlot = getSlot(18, 0, 60); // Matches the slot successfully booked in test (k)

    let errorThrown: any = null;
    try {
      await dataSource.query(`
        INSERT INTO bookings (room_id, user_id, title, attendee_count, start_time, end_time, status)
        VALUES ('${roomAId}', '${employee1Id}', 'Raw SQL Hijack', 3, '${rawSlot.startTime}', '${rawSlot.endTime}', 'CONFIRMED');
      `);
    } catch (err: any) {
      errorThrown = err;
    }

    expect(errorThrown).toBeDefined();
    // Verify PostgreSQL error code is 23P01 (exclusion_violation)
    expect(errorThrown.code).toBe('23P01');
  });
});
