import * as bcrypt from 'bcrypt';
import { DateTime } from 'luxon';
import AppDataSource from '../data-source';
import { User, UserRole } from '../../modules/users/entities/user.entity';
import { Room, RoomStatus } from '../../modules/rooms/entities/room.entity';
import { Booking, BookingStatus } from '../../modules/bookings/entities/booking.entity';
import { Notification, NotificationType } from '../../modules/notifications/entities/notification.entity';

const OFFICE_TZ = process.env.OFFICE_TIMEZONE || 'Asia/Kolkata';

export async function runSeed() {
  console.log('🌱 Starting idempotent seed process...');

  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  const userRepo = AppDataSource.getRepository(User);
  const roomRepo = AppDataSource.getRepository(Room);
  const bookingRepo = AppDataSource.getRepository(Booking);
  const notificationRepo = AppDataSource.getRepository(Notification);

  // 1. Create or Update Users
  const adminPasswordHash = await bcrypt.hash('Admin@12345', 10);
  const employeePasswordHash = await bcrypt.hash('Password@123', 10);

  const usersData = [
    {
      fullName: 'Sarah Connor (Admin)',
      email: 'admin@company.com',
      passwordHash: adminPasswordHash,
      role: UserRole.ADMIN,
      department: 'IT & Operations',
      isActive: true,
    },
    {
      fullName: 'Alex Chen',
      email: 'alex.chen@company.com',
      passwordHash: employeePasswordHash,
      role: UserRole.EMPLOYEE,
      department: 'Engineering',
      isActive: true,
    },
    {
      fullName: 'Priya Patel',
      email: 'priya.patel@company.com',
      passwordHash: employeePasswordHash,
      role: UserRole.EMPLOYEE,
      department: 'Product Design',
      isActive: true,
    },
    {
      fullName: 'Marcus Johnson',
      email: 'marcus.johnson@company.com',
      passwordHash: employeePasswordHash,
      role: UserRole.EMPLOYEE,
      department: 'Marketing',
      isActive: true,
    },
    {
      fullName: 'Elena Rostova',
      email: 'elena.rostova@company.com',
      passwordHash: employeePasswordHash,
      role: UserRole.EMPLOYEE,
      department: 'Finance',
      isActive: true,
    },
    {
      fullName: 'David Kim',
      email: 'david.kim@company.com',
      passwordHash: employeePasswordHash,
      role: UserRole.EMPLOYEE,
      department: 'Human Resources',
      isActive: true,
    },
  ];

  const seededUsers: User[] = [];
  for (const u of usersData) {
    let user = await userRepo.findOne({ where: { email: u.email } });
    if (!user) {
      user = userRepo.create(u);
      user = await userRepo.save(user);
      console.log(`  ✓ Created user: ${u.email} (${u.role})`);
    } else {
      user.fullName = u.fullName;
      user.department = u.department;
      user.role = u.role;
      user.passwordHash = u.passwordHash;
      user = await userRepo.save(user);
      console.log(`  ↻ Updated user: ${u.email}`);
    }
    seededUsers.push(user);
  }

  // 2. Create or Update Rooms (8 realistic rooms)
  const roomsData = [
    {
      name: 'Ada Lovelace Focus Room',
      floorOrLocation: '1st Floor, East Wing',
      capacity: 2,
      description: 'Quiet one-on-one pod equipped with acoustic insulation and high-speed fiber.',
      amenities: ['Phone', 'Accessible'],
      status: RoomStatus.ACTIVE,
      accentColor: '#7C6CFF', // Electric Indigo
    },
    {
      name: 'Alan Turing Collaboration Suite',
      floorOrLocation: '1st Floor, West Wing',
      capacity: 4,
      description: 'Compact team room ideal for pairing, code reviews, and quick standups.',
      amenities: ['Whiteboard', 'TV Screen'],
      status: RoomStatus.ACTIVE,
      accentColor: '#2DD4BF', // Teal
    },
    {
      name: 'Grace Hopper Conference Hall',
      floorOrLocation: '2nd Floor, Central Tower',
      capacity: 8,
      description: 'Medium presentation room featuring high-definition dual conferencing screens.',
      amenities: ['Projector', 'Whiteboard', 'Video Conferencing'],
      status: RoomStatus.ACTIVE,
      accentColor: '#F59E0B', // Amber
    },
    {
      name: 'Claude Shannon Media Studio',
      floorOrLocation: '2nd Floor, Studio Bay',
      capacity: 6,
      description: 'Sound-dampened studio for podcasting, design critiques, and executive interviews.',
      amenities: ['Video Conferencing', 'TV Screen', 'Accessible'],
      status: RoomStatus.ACTIVE,
      accentColor: '#38BDF8', // Sky Blue
    },
    {
      name: 'Margaret Hamilton Executive Boardroom',
      floorOrLocation: '3rd Floor, Executive Suite',
      capacity: 16,
      description: 'Flagship boardroom for board reviews, client presentations, and town halls.',
      amenities: ['Projector', 'Whiteboard', 'Video Conferencing', 'Phone', 'Accessible'],
      status: RoomStatus.ACTIVE,
      accentColor: '#A855F7', // Purple
    },
    {
      name: 'John von Neumann Workshop',
      floorOrLocation: '3rd Floor, North Wing',
      capacity: 10,
      description: 'Spacious workshop area tailored for sprint plannings and architectural reviews.',
      amenities: ['Whiteboard', 'TV Screen', 'Video Conferencing'],
      status: RoomStatus.ACTIVE,
      accentColor: '#10B981', // Emerald
    },
    {
      name: 'Katherine Johnson Innovation Lab',
      floorOrLocation: 'Ground Floor, Innovation Hub',
      capacity: 12,
      description: 'Flexible agile room featuring rolling whiteboards and multi-screen casting.',
      amenities: ['Projector', 'Whiteboard', 'TV Screen'],
      status: RoomStatus.ACTIVE,
      accentColor: '#FB7185', // Coral
    },
    {
      name: 'Apollo Skyline Grand Auditorium',
      floorOrLocation: '4th Floor, Skyline Penthouse',
      capacity: 30,
      description: 'Panoramic auditorium for departmental all-hands and company-wide demos.',
      amenities: ['Projector', 'Whiteboard', 'Video Conferencing', 'TV Screen', 'Phone', 'Accessible'],
      status: RoomStatus.ACTIVE,
      accentColor: '#6366F1', // Indigo
    },
  ];

  const seededRooms: Room[] = [];
  for (const r of roomsData) {
    let room = await roomRepo.findOne({ where: { name: r.name } });
    if (!room) {
      room = roomRepo.create(r);
      room = await roomRepo.save(room);
      console.log(`  ✓ Created room: ${r.name} (Cap: ${r.capacity})`);
    } else {
      room.floorOrLocation = r.floorOrLocation;
      room.capacity = r.capacity;
      room.description = r.description;
      room.amenities = r.amenities;
      room.accentColor = r.accentColor;
      room = await roomRepo.save(room);
      console.log(`  ↻ Updated room: ${r.name}`);
    }
    seededRooms.push(room);
  }

  // 3. Seed ~30 realistic bookings (past, today, upcoming)
  // Ensure we don't duplicate on multiple runs
  const existingCount = await bookingRepo.count();
  if (existingCount > 10) {
    console.log(`  ℹ Existing bookings found (${existingCount}). Skipping booking seed to avoid duplicates.`);
  } else {
    console.log('  📅 Generating realistic schedule across past, today, and future...');

    const nowTz = DateTime.now().setZone(OFFICE_TZ);
    const bookingsToInsert: Partial<Booking>[] = [];

    // Helper to generate a slot on a specific day offset
    const makeSlot = (
      dayOffset: number,
      startHour: number,
      startMin: number,
      durationMinutes: number
    ) => {
      const dt = nowTz.plus({ days: dayOffset }).set({
        hour: startHour,
        minute: startMin,
        second: 0,
        millisecond: 0,
      });
      const start = dt.toJSDate();
      const end = dt.plus({ minutes: durationMinutes }).toJSDate();
      return { start, end };
    };

    // Past bookings (days: -3, -2, -1)
    const pastOffsets = [-3, -2, -1];
    for (const d of pastOffsets) {
      // Room 0 (Ada Lovelace)
      let s = makeSlot(d, 9, 30, 60);
      bookingsToInsert.push({
        roomId: seededRooms[0].id,
        userId: seededUsers[1].id, // Alex
        title: 'Weekly 1:1 Sync',
        description: 'Engineering performance and career goals review.',
        attendeeCount: 2,
        startTime: s.start,
        endTime: s.end,
        status: BookingStatus.CONFIRMED,
      });

      // Room 1 (Alan Turing)
      s = makeSlot(d, 11, 0, 90);
      bookingsToInsert.push({
        roomId: seededRooms[1].id,
        userId: seededUsers[2].id, // Priya
        title: 'UI Design Critique',
        description: 'Reviewing component library and token contracts.',
        attendeeCount: 4,
        startTime: s.start,
        endTime: s.end,
        status: BookingStatus.CONFIRMED,
      });

      // Room 2 (Grace Hopper)
      s = makeSlot(d, 14, 0, 120);
      bookingsToInsert.push({
        roomId: seededRooms[2].id,
        userId: seededUsers[3].id, // Marcus
        title: 'Q4 Product Roadmap Sync',
        description: 'Cross-functional alignment on deliverables.',
        attendeeCount: 7,
        startTime: s.start,
        endTime: s.end,
        status: BookingStatus.CONFIRMED,
      });

      // Room 4 (Margaret Hamilton)
      s = makeSlot(d, 16, 30, 60);
      bookingsToInsert.push({
        roomId: seededRooms[4].id,
        userId: seededUsers[4].id, // Elena
        title: 'Budget Allocation Review',
        description: 'Financial runway and Q1 forecasts.',
        attendeeCount: 12,
        startTime: s.start,
        endTime: s.end,
        status: BookingStatus.CONFIRMED,
      });
    }

    // Today bookings (dayOffset: 0)
    // Morning slot
    let s = makeSlot(0, 9, 0, 60);
    bookingsToInsert.push({
      roomId: seededRooms[0].id,
      userId: seededUsers[1].id,
      title: 'Morning Standup & Pairing',
      description: 'Morning architecture breakdown.',
      attendeeCount: 2,
      startTime: s.start,
      endTime: s.end,
      status: BookingStatus.CONFIRMED,
    });

    s = makeSlot(0, 10, 30, 90);
    bookingsToInsert.push({
      roomId: seededRooms[2].id,
      userId: seededUsers[2].id,
      title: 'Client Demo: ReserveHub',
      description: 'Demonstrating interactive booking calendar to partners.',
      attendeeCount: 6,
      startTime: s.start,
      endTime: s.end,
      status: BookingStatus.CONFIRMED,
    });

    s = makeSlot(0, 13, 0, 60);
    bookingsToInsert.push({
      roomId: seededRooms[1].id,
      userId: seededUsers[3].id,
      title: 'Marketing Campaign Launch',
      description: 'Final asset checks for social blast.',
      attendeeCount: 3,
      startTime: s.start,
      endTime: s.end,
      status: BookingStatus.CONFIRMED,
    });

    s = makeSlot(0, 14, 30, 90);
    bookingsToInsert.push({
      roomId: seededRooms[5].id,
      userId: seededUsers[5].id, // David
      title: 'HR Hiring Committee',
      description: 'Senior Fullstack candidates review.',
      attendeeCount: 8,
      startTime: s.start,
      endTime: s.end,
      status: BookingStatus.CONFIRMED,
    });

    // Upcoming bookings (days: +1, +2, +3, +5)
    const futureOffsets = [1, 2, 3, 5];
    for (const d of futureOffsets) {
      s = makeSlot(d, 10, 0, 60);
      bookingsToInsert.push({
        roomId: seededRooms[0].id,
        userId: seededUsers[1].id,
        title: `Backend Sprint Grooming (D+${d})`,
        attendeeCount: 2,
        startTime: s.start,
        endTime: s.end,
        status: BookingStatus.CONFIRMED,
      });

      s = makeSlot(d, 11, 30, 60);
      bookingsToInsert.push({
        roomId: seededRooms[3].id,
        userId: seededUsers[2].id,
        title: `Design Systems Sync (D+${d})`,
        attendeeCount: 5,
        startTime: s.start,
        endTime: s.end,
        status: BookingStatus.CONFIRMED,
      });

      s = makeSlot(d, 14, 0, 120);
      bookingsToInsert.push({
        roomId: seededRooms[7].id,
        userId: seededUsers[0].id, // Admin
        title: `Department All-Hands (D+${d})`,
        attendeeCount: 25,
        startTime: s.start,
        endTime: s.end,
        status: BookingStatus.CONFIRMED,
      });

      s = makeSlot(d, 16, 30, 90);
      bookingsToInsert.push({
        roomId: seededRooms[6].id,
        userId: seededUsers[4].id,
        title: `Financial Audit Prep (D+${d})`,
        attendeeCount: 8,
        startTime: s.start,
        endTime: s.end,
        status: BookingStatus.CONFIRMED,
      });
    }

    // Add a few CANCELLED bookings to test history and release
    s = makeSlot(1, 13, 0, 60);
    bookingsToInsert.push({
      roomId: seededRooms[0].id,
      userId: seededUsers[3].id,
      title: 'Cancelled Ad-hoc Strategy',
      attendeeCount: 2,
      startTime: s.start,
      endTime: s.end,
      status: BookingStatus.CANCELLED,
      cancelledAt: nowTz.toJSDate(),
      cancelledBy: seededUsers[3].id,
      cancellationReason: 'Rescheduled as an async document review.',
    });

    s = makeSlot(2, 9, 0, 60);
    bookingsToInsert.push({
      roomId: seededRooms[1].id,
      userId: seededUsers[4].id,
      title: 'Cancelled Vendor Onboarding',
      attendeeCount: 3,
      startTime: s.start,
      endTime: s.end,
      status: BookingStatus.CANCELLED,
      cancelledAt: nowTz.toJSDate(),
      cancelledBy: seededUsers[0].id, // Cancelled by Admin
      cancellationReason: 'Vendor rescheduled visit date.',
    });

    // Save bookings sequentially to ensure GiST verification
    for (const b of bookingsToInsert) {
      const entity = bookingRepo.create(b);
      await bookingRepo.save(entity);
    }
    console.log(`  ✓ Inserted ${bookingsToInsert.length} realistic non-overlapping bookings.`);

    // 4. Seed initial notifications for realistic feed
    const sampleNotifications = [
      {
        userId: seededUsers[1].id,
        type: NotificationType.BOOKING_CONFIRMED,
        title: 'Booking Confirmed',
        message: 'Your meeting "Morning Standup & Pairing" has been confirmed in Ada Lovelace Focus Room.',
        isRead: false,
      },
      {
        userId: seededUsers[2].id,
        type: NotificationType.BOOKING_CONFIRMED,
        title: 'Booking Confirmed',
        message: 'Your meeting "Client Demo: ReserveHub" in Grace Hopper Conference Hall is confirmed.',
        isRead: true,
      },
      {
        userId: seededUsers[3].id,
        type: NotificationType.BOOKING_CANCELLED,
        title: 'Booking Cancelled',
        message: 'Your meeting "Cancelled Ad-hoc Strategy" has been cancelled.',
        isRead: false,
      },
    ];

    for (const n of sampleNotifications) {
      const notif = notificationRepo.create(n);
      await notificationRepo.save(notif);
    }
    console.log(`  ✓ Seeded sample notifications.`);
  }

  console.log('✅ Seed completed successfully!');
}

if (require.main === module) {
  runSeed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Seed failed:', err);
      process.exit(1);
    });
}
