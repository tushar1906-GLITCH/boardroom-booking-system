import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull } from 'typeorm';
import { Booking, BookingStatus } from './entities/booking.entity';
import { Room, RoomStatus } from '../rooms/entities/room.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { Notification, NotificationType } from '../notifications/entities/notification.entity';
import { CreateBookingDto } from './dto/create-booking.dto';
import { RescheduleBookingDto } from './dto/reschedule-booking.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { FindBookingsQueryDto, BookingScope } from './dto/find-bookings.dto';
import { validateBookingTiming } from '../../common/utils/date-time.util';
import { buildPaginatedResponse } from '../../common/dto/pagination.dto';

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
    @InjectRepository(Room)
    private roomRepository: Repository<Room>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    private dataSource: DataSource,
  ) {}

  /**
   * Creates a new booking. The PostgreSQL GiST exclusion constraint acts as the final
   * mathematical authority preventing double-bookings even under concurrent requests.
   */
  async create(dto: CreateBookingDto, userId: string) {
    // 1. Validate timing business rules (30-min grid, duration, business hours, future)
    const { startTz, endTz } = validateBookingTiming(dto.startTime, dto.endTime);
    const startDate = startTz.toJSDate();
    const endDate = endTz.toJSDate();

    // 2. Validate Room
    const room = await this.roomRepository.findOne({
      where: { id: dto.roomId, deletedAt: IsNull() },
    });
    if (!room) {
      throw new NotFoundException(`Room with ID ${dto.roomId} not found.`);
    }

    if (room.status === RoomStatus.MAINTENANCE) {
      throw new BadRequestException(
        `Room "${room.name}" is currently under maintenance and cannot be booked.`,
      );
    }

    if (dto.attendeeCount > room.capacity) {
      throw new BadRequestException(
        `Attendee count (${dto.attendeeCount}) exceeds room capacity (${room.capacity}).`,
      );
    }

    // 3. Attempt direct insert; catch exclusion constraint violation 23P01
    try {
      const booking = this.bookingRepository.create({
        roomId: dto.roomId,
        userId,
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        attendeeCount: dto.attendeeCount,
        startTime: startDate,
        endTime: endDate,
        status: BookingStatus.CONFIRMED,
        reminderMinutesBefore: dto.reminderMinutesBefore !== undefined ? dto.reminderMinutesBefore : 15,
      });

      const savedBooking = await this.bookingRepository.save(booking);

      // Create confirmation in-app notification
      const notif = this.notificationRepository.create({
        userId,
        type: NotificationType.BOOKING_CONFIRMED,
        title: 'Meeting Confirmed',
        message: `Your booking "${savedBooking.title}" in ${room.name} has been confirmed for ${startTz.toFormat('ccc, LLL dd, yyyy HH:mm')}.`,
        bookingId: savedBooking.id,
        isRead: false,
      });
      await this.notificationRepository.save(notif);

      return this.findOne(savedBooking.id, userId, UserRole.EMPLOYEE);
    } catch (err: any) {
      if (err.code === '23P01' || err.message?.includes('bookings_no_overlap')) {
        // Find existing conflicting booking details to offer user clarity
        const conflict = await this.bookingRepository
          .createQueryBuilder('b')
          .innerJoinAndSelect('b.user', 'u')
          .where('b.roomId = :roomId', { roomId: dto.roomId })
          .andWhere('b.status = :status', { status: BookingStatus.CONFIRMED })
          .andWhere('tstzrange(b.startTime, b.endTime, \'[)\') && tstzrange(:start, :end, \'[)\')', {
            start: startDate.toISOString(),
            end: endDate.toISOString(),
          })
          .getOne();

        const conflictHint = conflict
          ? ` Occupied by "${conflict.title}" (Organized by ${conflict.user.fullName}) from ${conflict.startTime.toLocaleTimeString()} to ${conflict.endTime.toLocaleTimeString()}.`
          : '';

        throw new ConflictException(
          `This room is already booked for part of the selected time.${conflictHint}`,
        );
      }
      throw err;
    }
  }

  /**
   * Retrieves bookings owned by the authenticated employee with scope filters.
   */
  async findMine(userId: string, query: FindBookingsQueryDto) {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 10;
    const skip = (page - 1) * pageSize;
    const now = new Date();

    const qb = this.bookingRepository
      .createQueryBuilder('b')
      .innerJoinAndSelect('b.room', 'r')
      .innerJoinAndSelect('b.user', 'u')
      .leftJoinAndSelect('b.cancelledByUser', 'cb')
      .where('b.userId = :userId', { userId });

    // Handle Scope
    if (query.scope === BookingScope.UPCOMING) {
      qb.andWhere('b.status = :status AND b.endTime >= :now', {
        status: BookingStatus.CONFIRMED,
        now,
      });
      qb.orderBy('b.startTime', 'ASC');
    } else if (query.scope === BookingScope.PAST) {
      qb.andWhere('b.status = :status AND b.endTime < :now', {
        status: BookingStatus.CONFIRMED,
        now,
      });
      qb.orderBy('b.startTime', 'DESC');
    } else if (query.scope === BookingScope.CANCELLED) {
      qb.andWhere('b.status = :status', { status: BookingStatus.CANCELLED });
      qb.orderBy('b.cancelledAt', 'DESC');
    } else {
      qb.orderBy('b.startTime', 'DESC');
    }

    if (query.search) {
      const s = `%${query.search.trim()}%`;
      qb.andWhere('(b.title ILIKE :s OR r.name ILIKE :s OR b.description ILIKE :s)', { s });
    }

    if (query.roomId) {
      qb.andWhere('b.roomId = :roomId', { roomId: query.roomId });
    }

    if (query.from) {
      qb.andWhere('b.startTime >= :from', { from: query.from });
    }

    if (query.to) {
      qb.andWhere('b.endTime <= :to', { to: query.to });
    }

    qb.skip(skip).take(pageSize);

    const [bookings, total] = await qb.getManyAndCount();
    return buildPaginatedResponse(bookings, total, page, pageSize);
  }

  /**
   * Retrieves single booking by ID with ownership/admin verification.
   */
  async findOne(id: string, userId: string, userRole: string) {
    const booking = await this.bookingRepository
      .createQueryBuilder('b')
      .innerJoinAndSelect('b.room', 'r')
      .innerJoinAndSelect('b.user', 'u')
      .leftJoinAndSelect('b.cancelledByUser', 'cb')
      .where('b.id = :id', { id })
      .getOne();

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${id} not found.`);
    }

    if (userRole !== UserRole.ADMIN && booking.userId !== userId) {
      throw new ForbiddenException('You do not have permission to view this booking.');
    }

    return booking;
  }

  /**
   * Reschedules an active booking to a new time window or room.
   * Allows the booking to overlap its OWN old slot without false positive conflict.
   */
  async reschedule(id: string, dto: RescheduleBookingDto, userId: string, userRole: string) {
    const booking = await this.bookingRepository.findOne({
      where: { id },
      relations: ['room', 'user'],
    });

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${id} not found.`);
    }

    // Role check: Only owner or admin
    if (userRole !== UserRole.ADMIN && booking.userId !== userId) {
      throw new ForbiddenException('You do not have permission to reschedule this booking.');
    }

    // Can only reschedule CONFIRMED bookings
    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException('Only confirmed bookings can be rescheduled.');
    }

    const now = new Date();
    // Non-admin can only reschedule future bookings
    if (userRole !== UserRole.ADMIN && booking.startTime <= now) {
      throw new BadRequestException('Past or ongoing meetings cannot be rescheduled.');
    }

    // Validate new timing rules
    const { startTz, endTz } = validateBookingTiming(dto.startTime, dto.endTime);
    const newStart = startTz.toJSDate();
    const newEnd = endTz.toJSDate();
    const targetRoomId = dto.roomId || booking.roomId;

    // Check if new values are identical to current
    if (
      targetRoomId === booking.roomId &&
      newStart.getTime() === booking.startTime.getTime() &&
      newEnd.getTime() === booking.endTime.getTime()
    ) {
      throw new BadRequestException('New time slot must be different from current booking time.');
    }

    // Verify target room
    const targetRoom = await this.roomRepository.findOne({
      where: { id: targetRoomId, deletedAt: IsNull() },
    });
    if (!targetRoom) {
      throw new NotFoundException(`Target room not found.`);
    }

    if (targetRoom.status === RoomStatus.MAINTENANCE) {
      throw new BadRequestException(`Target room "${targetRoom.name}" is currently under maintenance.`);
    }

    if (booking.attendeeCount > targetRoom.capacity) {
      throw new BadRequestException(
        `Booking attendee count (${booking.attendeeCount}) exceeds target room capacity (${targetRoom.capacity}).`,
      );
    }

    // Execute atomic update; catch 23P01 exclusion violation
    try {
      await this.bookingRepository.update(
        { id: booking.id },
        {
          roomId: targetRoomId,
          startTime: newStart,
          endTime: newEnd,
          rescheduleCount: booking.rescheduleCount + 1,
          reminderSentAt: null,
        },
      );

      // Notification
      const notif = this.notificationRepository.create({
        userId: booking.userId,
        type: NotificationType.BOOKING_RESCHEDULED,
        title: 'Meeting Rescheduled',
        message: `Your booking "${booking.title}" has been moved to ${startTz.toFormat('ccc, LLL dd, yyyy HH:mm')} in ${targetRoom.name}.`,
        bookingId: booking.id,
        isRead: false,
      });
      await this.notificationRepository.save(notif);

      return this.findOne(booking.id, userId, userRole);
    } catch (err: any) {
      if (err.code === '23P01' || err.message?.includes('bookings_no_overlap')) {
        throw new ConflictException('This room is already booked for part of the selected time.');
      }
      throw err;
    }
  }

  /**
   * Cancels a booking, immediately releasing the slot via the exclusion constraint.
   */
  async cancel(id: string, dto: CancelBookingDto, userId: string, userRole: string) {
    const booking = await this.bookingRepository.findOne({
      where: { id },
      relations: ['room', 'user'],
    });

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${id} not found.`);
    }

    // Permission check
    if (userRole !== UserRole.ADMIN && booking.userId !== userId) {
      throw new ForbiddenException('You do not have permission to cancel this booking.');
    }

    if (booking.status === BookingStatus.CANCELLED) {
      throw new BadRequestException('This booking has already been cancelled.');
    }

    const now = new Date();
    // Employee may cancel only if start_time > now. Admin may cancel at any time.
    if (userRole !== UserRole.ADMIN && booking.startTime <= now) {
      throw new BadRequestException('Past or ongoing meetings cannot be cancelled by employees.');
    }

    booking.status = BookingStatus.CANCELLED;
    booking.cancelledAt = now;
    booking.cancelledBy = userId;
    booking.cancellationReason = dto.reason?.trim() || null;

    const saved = await this.bookingRepository.save(booking);

    // Notify owner
    const isAdminCancellingOther = userRole === UserRole.ADMIN && userId !== booking.userId;
    const notifType = isAdminCancellingOther
      ? NotificationType.BOOKING_CANCELLED_BY_ADMIN
      : NotificationType.BOOKING_CANCELLED;

    const notif = this.notificationRepository.create({
      userId: booking.userId,
      type: notifType,
      title: isAdminCancellingOther ? 'Booking Cancelled by Administrator' : 'Booking Cancelled',
      message: isAdminCancellingOther
        ? `Your meeting "${booking.title}" in ${booking.room.name} was cancelled by an admin. Reason: ${dto.reason || 'No reason provided.'}`
        : `Your meeting "${booking.title}" in ${booking.room.name} has been cancelled.`,
      bookingId: booking.id,
      isRead: false,
    });
    await this.notificationRepository.save(notif);

    return this.findOne(saved.id, userId, userRole);
  }

  /**
   * Returns calendar event feed for FullCalendar.
   */
  async getCalendarEvents(from: string, to: string, roomIds?: string) {
    if (!from || !to) {
      throw new BadRequestException('from and to ISO date query parameters are required.');
    }

    const qb = this.bookingRepository
      .createQueryBuilder('b')
      .innerJoinAndSelect('b.room', 'r')
      .innerJoinAndSelect('b.user', 'u')
      .where('b.status = :status', { status: BookingStatus.CONFIRMED })
      .andWhere('b.startTime < :to AND b.endTime > :from', {
        from: new Date(from),
        to: new Date(to),
      });

    if (roomIds) {
      const ids = roomIds.split(',').map((id) => id.trim()).filter(Boolean);
      if (ids.length > 0) {
        qb.andWhere('b.roomId IN (:...ids)', { ids });
      }
    }

    const bookings = await qb.orderBy('b.startTime', 'ASC').getMany();

    return bookings.map((b) => ({
      id: b.id,
      title: b.title,
      start: b.startTime.toISOString(),
      end: b.endTime.toISOString(),
      backgroundColor: b.room.accentColor,
      borderColor: b.room.accentColor,
      textColor: '#FFFFFF',
      extendedProps: {
        bookingId: b.id,
        roomId: b.room.id,
        roomName: b.room.name,
        roomLocation: b.room.floorOrLocation,
        organizerId: b.user.id,
        organizer: b.user.fullName,
        organizerEmail: b.user.email,
        attendeeCount: b.attendeeCount,
        description: b.description,
        status: b.status,
      },
    }));
  }

  /**
   * Admin view of all bookings across the enterprise.
   */
  async findAllAdmin(query: FindBookingsQueryDto) {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 10;
    const skip = (page - 1) * pageSize;

    const qb = this.bookingRepository
      .createQueryBuilder('b')
      .innerJoinAndSelect('b.room', 'r')
      .innerJoinAndSelect('b.user', 'u')
      .leftJoinAndSelect('b.cancelledByUser', 'cb');

    if (query.status) {
      qb.andWhere('b.status = :status', { status: query.status });
    }

    if (query.roomId) {
      qb.andWhere('b.roomId = :roomId', { roomId: query.roomId });
    }

    if (query.userId) {
      qb.andWhere('b.userId = :userId', { userId: query.userId });
    }

    if (query.search) {
      const s = `%${query.search.trim()}%`;
      qb.andWhere('(b.title ILIKE :s OR r.name ILIKE :s OR u.fullName ILIKE :s OR u.email ILIKE :s)', { s });
    }

    if (query.from) {
      qb.andWhere('b.startTime >= :from', { from: query.from });
    }

    if (query.to) {
      qb.andWhere('b.endTime <= :to', { to: query.to });
    }

    qb.orderBy('b.startTime', 'DESC');
    qb.skip(skip).take(pageSize);

    const [bookings, total] = await qb.getManyAndCount();
    return buildPaginatedResponse(bookings, total, page, pageSize);
  }
}
