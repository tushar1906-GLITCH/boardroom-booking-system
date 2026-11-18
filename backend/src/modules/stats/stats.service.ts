import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Between } from 'typeorm';
import { DateTime } from 'luxon';
import { Room, RoomStatus } from '../rooms/entities/room.entity';
import { Booking, BookingStatus } from '../bookings/entities/booking.entity';
import { getDefaultTimeConfig } from '../../common/utils/date-time.util';

@Injectable()
export class StatsService {
  constructor(
    @InjectRepository(Room)
    private roomRepository: Repository<Room>,
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
  ) {}

  /**
   * High-level metrics for admin dashboard.
   */
  async getOverview() {
    const config = getDefaultTimeConfig();
    const nowTz = DateTime.now().setZone(config.officeTimezone);
    const todayStart = nowTz.startOf('day').toJSDate();
    const todayEnd = nowTz.endOf('day').toJSDate();
    const thirtyDaysAgo = nowTz.minus({ days: 30 }).startOf('day').toJSDate();

    // 1. Total rooms
    const totalRooms = await this.roomRepository.count({
      where: { deletedAt: IsNull(), status: RoomStatus.ACTIVE },
    });

    // 2. Bookings today
    const bookingsToday = await this.bookingRepository
      .createQueryBuilder('b')
      .where('b.status = :status', { status: BookingStatus.CONFIRMED })
      .andWhere('b.startTime >= :todayStart AND b.startTime <= :todayEnd', {
        todayStart,
        todayEnd,
      })
      .getCount();

    // 3. Upcoming bookings
    const upcomingBookings = await this.bookingRepository
      .createQueryBuilder('b')
      .where('b.status = :status', { status: BookingStatus.CONFIRMED })
      .andWhere('b.startTime >= :now', { now: nowTz.toJSDate() })
      .getCount();

    // 4. Bookings in last 30 days & cancellation rate
    const total30d = await this.bookingRepository
      .createQueryBuilder('b')
      .where('b.createdAt >= :thirtyDaysAgo', { thirtyDaysAgo })
      .getCount();

    const cancelled30d = await this.bookingRepository
      .createQueryBuilder('b')
      .where('b.createdAt >= :thirtyDaysAgo', { thirtyDaysAgo })
      .andWhere('b.status = :status', { status: BookingStatus.CANCELLED })
      .getCount();

    const cancellationRate = total30d > 0 ? Number(((cancelled30d / total30d) * 100).toFixed(1)) : 0;

    // 5. Room utilization (last 30 days)
    // Booked hours / Available business hours
    const confirmed30dBookings = await this.bookingRepository
      .createQueryBuilder('b')
      .where('b.startTime >= :thirtyDaysAgo', { thirtyDaysAgo })
      .andWhere('b.status = :status', { status: BookingStatus.CONFIRMED })
      .getMany();

    let totalBookedHours = 0;
    for (const b of confirmed30dBookings) {
      const diffHours = (b.endTime.getTime() - b.startTime.getTime()) / (1000 * 60 * 60);
      totalBookedHours += diffHours;
    }

    const businessHoursPerDay = 12; // 08:00 - 20:00
    const workingDaysIn30d = 22;
    const totalAvailableHours = (totalRooms || 1) * workingDaysIn30d * businessHoursPerDay;
    const avgUtilization = Math.min(
      100,
      Number(((totalBookedHours / totalAvailableHours) * 100).toFixed(1)),
    );

    return {
      totalRooms,
      bookingsToday,
      upcomingBookings,
      totalBookingsLast30Days: total30d,
      cancelledBookingsLast30Days: cancelled30d,
      cancellationRate,
      totalBookedHours: Number(totalBookedHours.toFixed(1)),
      averageRoomUtilization: avgUtilization,
    };
  }

  /**
   * 30-day booking trends for area/bar chart.
   */
  async getBookingsPerDay(daysCount: number = 30) {
    const config = getDefaultTimeConfig();
    const nowTz = DateTime.now().setZone(config.officeTimezone);
    const startDate = nowTz.minus({ days: daysCount - 1 }).startOf('day');

    const bookings = await this.bookingRepository
      .createQueryBuilder('b')
      .where('b.startTime >= :start', { start: startDate.toJSDate() })
      .getMany();

    const dailyMap = new Map<string, { date: string; confirmed: number; cancelled: number; total: number }>();

    for (let i = 0; i < daysCount; i++) {
      const dayStr = startDate.plus({ days: i }).toISODate()!;
      dailyMap.set(dayStr, { date: dayStr, confirmed: 0, cancelled: 0, total: 0 });
    }

    for (const b of bookings) {
      const bDay = DateTime.fromJSDate(b.startTime).setZone(config.officeTimezone).toISODate();
      if (bDay && dailyMap.has(bDay)) {
        const item = dailyMap.get(bDay)!;
        item.total += 1;
        if (b.status === BookingStatus.CONFIRMED) {
          item.confirmed += 1;
        } else if (b.status === BookingStatus.CANCELLED) {
          item.cancelled += 1;
        }
      }
    }

    return Array.from(dailyMap.values());
  }

  /**
   * Utilization percentage and hours grouped per room.
   */
  async getRoomUtilization() {
    const config = getDefaultTimeConfig();
    const thirtyDaysAgo = DateTime.now().setZone(config.officeTimezone).minus({ days: 30 }).startOf('day').toJSDate();

    const rooms = await this.roomRepository.find({
      where: { deletedAt: IsNull() },
      order: { name: 'ASC' },
    });

    const bookings = await this.bookingRepository
      .createQueryBuilder('b')
      .where('b.startTime >= :thirtyDaysAgo', { thirtyDaysAgo })
      .andWhere('b.status = :status', { status: BookingStatus.CONFIRMED })
      .getMany();

    const availableHoursPerRoom = 22 * 12; // 22 working days * 12 hours

    return rooms.map((room) => {
      const roomBookings = bookings.filter((b) => b.roomId === room.id);
      let totalHours = 0;
      for (const b of roomBookings) {
        totalHours += (b.endTime.getTime() - b.startTime.getTime()) / (1000 * 60 * 60);
      }

      const utilizationPercentage = Math.min(
        100,
        Number(((totalHours / availableHoursPerRoom) * 100).toFixed(1)),
      );

      return {
        roomId: room.id,
        roomName: room.name,
        accentColor: room.accentColor,
        capacity: room.capacity,
        totalBookings: roomBookings.length,
        totalHours: Number(totalHours.toFixed(1)),
        utilizationPercentage,
      };
    });
  }

  /**
   * Heatmap dataset: booking counts across weekday x hour.
   */
  async getPeakHours() {
    const config = getDefaultTimeConfig();
    const thirtyDaysAgo = DateTime.now().setZone(config.officeTimezone).minus({ days: 30 }).startOf('day').toJSDate();

    const bookings = await this.bookingRepository
      .createQueryBuilder('b')
      .where('b.startTime >= :thirtyDaysAgo', { thirtyDaysAgo })
      .andWhere('b.status = :status', { status: BookingStatus.CONFIRMED })
      .getMany();

    const weekdayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    const grid: { day: number; dayName: string; hour: number; count: number }[] = [];

    // Weekdays 1-5, Hours 8 to 19 (08:00 - 20:00)
    for (let day = 1; day <= 5; day++) {
      for (let hour = 8; hour < 20; hour++) {
        grid.push({
          day,
          dayName: weekdayNames[day - 1],
          hour,
          count: 0,
        });
      }
    }

    for (const b of bookings) {
      const bTz = DateTime.fromJSDate(b.startTime).setZone(config.officeTimezone);
      const weekday = bTz.weekday;
      const hour = bTz.hour;

      const cell = grid.find((c) => c.day === weekday && c.hour === hour);
      if (cell) {
        cell.count += 1;
      }
    }

    return grid;
  }

  /**
   * Top 5 most booked rooms in the last 30 days.
   */
  async getTopRooms() {
    const utilization = await this.getRoomUtilization();
    return utilization.sort((a, b) => b.totalBookings - a.totalBookings).slice(0, 5);
  }

  /**
   * Personal metrics for employee dashboard.
   */
  async getMeStats(userId: string) {
    const config = getDefaultTimeConfig();
    const nowTz = DateTime.now().setZone(config.officeTimezone);
    const weekStart = nowTz.startOf('week').toJSDate();
    const weekEnd = nowTz.endOf('week').toJSDate();
    const monthStart = nowTz.startOf('month').toJSDate();
    const monthEnd = nowTz.endOf('month').toJSDate();

    // 1. Next meeting
    const nextMeeting = await this.bookingRepository
      .createQueryBuilder('b')
      .innerJoinAndSelect('b.room', 'r')
      .where('b.userId = :userId', { userId })
      .andWhere('b.status = :status', { status: BookingStatus.CONFIRMED })
      .andWhere('b.startTime >= :now', { now: nowTz.toJSDate() })
      .orderBy('b.startTime', 'ASC')
      .getOne();

    // 2. Bookings this week
    const bookingsThisWeek = await this.bookingRepository
      .createQueryBuilder('b')
      .where('b.userId = :userId', { userId })
      .andWhere('b.status = :status', { status: BookingStatus.CONFIRMED })
      .andWhere('b.startTime >= :weekStart AND b.startTime <= :weekEnd', {
        weekStart,
        weekEnd,
      })
      .getCount();

    // 3. Hours booked this month
    const thisMonthBookings = await this.bookingRepository
      .createQueryBuilder('b')
      .where('b.userId = :userId', { userId })
      .andWhere('b.status = :status', { status: BookingStatus.CONFIRMED })
      .andWhere('b.startTime >= :monthStart AND b.startTime <= :monthEnd', {
        monthStart,
        monthEnd,
      })
      .getMany();

    let hoursThisMonth = 0;
    for (const b of thisMonthBookings) {
      hoursThisMonth += (b.endTime.getTime() - b.startTime.getTime()) / (1000 * 60 * 60);
    }

    // 4. Completed meetings
    const completedCount = await this.bookingRepository
      .createQueryBuilder('b')
      .where('b.userId = :userId', { userId })
      .andWhere('b.status = :status', { status: BookingStatus.CONFIRMED })
      .andWhere('b.endTime < :now', { now: nowTz.toJSDate() })
      .getCount();

    return {
      nextMeeting: nextMeeting
        ? {
            id: nextMeeting.id,
            title: nextMeeting.title,
            roomName: nextMeeting.room.name,
            floorOrLocation: nextMeeting.room.floorOrLocation,
            accentColor: nextMeeting.room.accentColor,
            startTime: nextMeeting.startTime,
            endTime: nextMeeting.endTime,
            attendeeCount: nextMeeting.attendeeCount,
          }
        : null,
      bookingsThisWeek,
      hoursBookedThisMonth: Number(hoursThisMonth.toFixed(1)),
      totalMeetingsAttended: completedCount,
    };
  }
}
