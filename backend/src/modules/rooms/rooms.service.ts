import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull } from 'typeorm';
import { DateTime } from 'luxon';
import { Room, RoomStatus } from './entities/room.entity';
import { Booking, BookingStatus } from '../bookings/entities/booking.entity';
import { Notification, NotificationType } from '../notifications/entities/notification.entity';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { FindRoomsQueryDto } from './dto/find-rooms.dto';
import { buildPaginatedResponse } from '../../common/dto/pagination.dto';
import { getDefaultTimeConfig } from '../../common/utils/date-time.util';

const ACCENT_PALETTE = [
  '#7C6CFF', // Electric Indigo
  '#2DD4BF', // Teal
  '#F59E0B', // Amber
  '#38BDF8', // Sky Blue
  '#A855F7', // Purple
  '#10B981', // Emerald
  '#FB7185', // Coral
  '#6366F1', // Indigo
];

@Injectable()
export class RoomsService {
  constructor(
    @InjectRepository(Room)
    private roomRepository: Repository<Room>,
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    private dataSource: DataSource,
  ) {}

  /**
   * Retrieves rooms with filters, pagination, and real-time availability metadata.
   */
  async findAll(query: FindRoomsQueryDto) {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 12;
    const skip = (page - 1) * pageSize;

    const qb = this.roomRepository.createQueryBuilder('room');
    qb.where('room.deletedAt IS NULL');

    if (query.search) {
      const s = `%${query.search.trim()}%`;
      qb.andWhere('(room.name ILIKE :s OR room.floorOrLocation ILIKE :s OR room.description ILIKE :s)', { s });
    }

    if (query.minCapacity) {
      qb.andWhere('room.capacity >= :minCap', { minCap: query.minCapacity });
    }

    if (query.maxCapacity) {
      qb.andWhere('room.capacity <= :maxCap', { maxCap: query.maxCapacity });
    }

    if (query.status) {
      qb.andWhere('room.status = :status', { status: query.status });
    }

    if (query.amenities) {
      const amenitiesList = query.amenities
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean);
      if (amenitiesList.length > 0) {
        qb.andWhere('room.amenities @> :amenities', { amenities: amenitiesList });
      }
    }

    // Filter by availability range if supplied
    if (query.availableFrom && query.availableTo) {
      qb.andWhere('room.status = :activeStatus', { activeStatus: RoomStatus.ACTIVE });
      qb.andWhere((subQuery) => {
        const sub = subQuery
          .subQuery()
          .select('1')
          .from(Booking, 'b')
          .where('b.roomId = room.id')
          .andWhere('b.status = :confirmedStatus', { confirmedStatus: BookingStatus.CONFIRMED })
          .andWhere('tstzrange(b.startTime, b.endTime, \'[)\') && tstzrange(:from, :to, \'[)\')', {
            from: query.availableFrom,
            to: query.availableTo,
          })
          .getQuery();
        return `NOT EXISTS ${sub}`;
      });
    }

    if (query.sort === 'capacity_asc') {
      qb.orderBy('room.capacity', 'ASC');
    } else if (query.sort === 'capacity_desc') {
      qb.orderBy('room.capacity', 'DESC');
    } else if (query.sort === 'name') {
      qb.orderBy('room.name', 'ASC');
    } else {
      qb.orderBy('room.createdAt', 'ASC');
    }

    qb.skip(skip).take(pageSize);

    const [rooms, total] = await qb.getManyAndCount();

    // Enrich each room with real-time isAvailableNow and nextBooking
    const now = new Date();
    const enrichedRooms = await Promise.all(
      rooms.map(async (room) => {
        if (room.status === RoomStatus.MAINTENANCE) {
          return {
            ...room,
            isAvailableNow: false,
            currentBooking: null,
            nextBooking: null,
          };
        }

        // Check if currently occupied
        const currentBooking = await this.bookingRepository
          .createQueryBuilder('b')
          .innerJoinAndSelect('b.user', 'u')
          .where('b.roomId = :roomId', { roomId: room.id })
          .andWhere('b.status = :status', { status: BookingStatus.CONFIRMED })
          .andWhere(':now >= b.startTime AND :now < b.endTime', { now })
          .getOne();

        // Find next upcoming booking
        const nextBooking = await this.bookingRepository
          .createQueryBuilder('b')
          .innerJoinAndSelect('b.user', 'u')
          .where('b.roomId = :roomId', { roomId: room.id })
          .andWhere('b.status = :status', { status: BookingStatus.CONFIRMED })
          .andWhere('b.startTime >= :now', { now })
          .orderBy('b.startTime', 'ASC')
          .getOne();

        return {
          ...room,
          isAvailableNow: !currentBooking,
          currentBooking: currentBooking
            ? {
                id: currentBooking.id,
                title: currentBooking.title,
                organizer: currentBooking.user.fullName,
                startTime: currentBooking.startTime,
                endTime: currentBooking.endTime,
              }
            : null,
          nextBooking: nextBooking
            ? {
                id: nextBooking.id,
                title: nextBooking.title,
                organizer: nextBooking.user.fullName,
                startTime: nextBooking.startTime,
                endTime: nextBooking.endTime,
              }
            : null,
        };
      }),
    );

    return buildPaginatedResponse(enrichedRooms, total, page, pageSize);
  }

  async findOne(id: string) {
    const room = await this.roomRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });
    if (!room) {
      throw new NotFoundException(`Room with ID ${id} not found.`);
    }

    const now = new Date();
    const currentBooking = await this.bookingRepository
      .createQueryBuilder('b')
      .innerJoinAndSelect('b.user', 'u')
      .where('b.roomId = :roomId', { roomId: room.id })
      .andWhere('b.status = :status', { status: BookingStatus.CONFIRMED })
      .andWhere(':now >= b.startTime AND :now < b.endTime', { now })
      .getOne();

    const nextBooking = await this.bookingRepository
      .createQueryBuilder('b')
      .innerJoinAndSelect('b.user', 'u')
      .where('b.roomId = :roomId', { roomId: room.id })
      .andWhere('b.status = :status', { status: BookingStatus.CONFIRMED })
      .andWhere('b.startTime >= :now', { now })
      .orderBy('b.startTime', 'ASC')
      .getOne();

    return {
      ...room,
      isAvailableNow: room.status === RoomStatus.ACTIVE && !currentBooking,
      currentBooking: currentBooking
        ? {
            id: currentBooking.id,
            title: currentBooking.title,
            organizer: currentBooking.user.fullName,
            startTime: currentBooking.startTime,
            endTime: currentBooking.endTime,
          }
        : null,
      nextBooking: nextBooking
        ? {
            id: nextBooking.id,
            title: nextBooking.title,
            organizer: nextBooking.user.fullName,
            startTime: nextBooking.startTime,
            endTime: nextBooking.endTime,
          }
        : null,
    };
  }

  /**
   * Computes busy intervals and available 30-minute free slots for a given room on a date.
   */
  async getAvailability(roomId: string, dateStr: string) {
    const room = await this.roomRepository.findOne({
      where: { id: roomId, deletedAt: IsNull() },
    });
    if (!room) {
      throw new NotFoundException(`Room with ID ${roomId} not found.`);
    }

    const config = getDefaultTimeConfig();
    const day = DateTime.fromISO(dateStr, { zone: config.officeTimezone });
    if (!day.isValid) {
      throw new BadRequestException('Invalid date format. Expected YYYY-MM-DD.');
    }

    const [bStartH, bStartM] = config.businessHoursStart.split(':').map((v) => parseInt(v, 10));
    const [bEndH, bEndM] = config.businessHoursEnd.split(':').map((v) => parseInt(v, 10));

    const dayStart = day.set({ hour: bStartH, minute: bStartM, second: 0, millisecond: 0 });
    const dayEnd = day.set({ hour: bEndH, minute: bEndM, second: 0, millisecond: 0 });

    // Fetch all confirmed bookings that overlap this business day
    const bookings = await this.bookingRepository
      .createQueryBuilder('b')
      .innerJoinAndSelect('b.user', 'u')
      .where('b.roomId = :roomId', { roomId })
      .andWhere('b.status = :status', { status: BookingStatus.CONFIRMED })
      .andWhere('b.startTime < :dayEnd AND b.endTime > :dayStart', {
        dayStart: dayStart.toJSDate(),
        dayEnd: dayEnd.toJSDate(),
      })
      .orderBy('b.startTime', 'ASC')
      .getMany();

    const busySlots = bookings.map((b) => ({
      id: b.id,
      title: b.title,
      organizer: b.user.fullName,
      startTime: b.startTime.toISOString(),
      endTime: b.endTime.toISOString(),
    }));

    // Generate 30-minute grid slots and check whether each is free
    const freeSlots: { startTime: string; endTime: string }[] = [];
    const isBusinessDay = config.businessDays.includes(day.weekday);

    if (isBusinessDay && room.status === RoomStatus.ACTIVE) {
      let currentSlot = dayStart;
      while (currentSlot < dayEnd) {
        const nextSlot = currentSlot.plus({ minutes: 30 });
        const slotStart = currentSlot.toJSDate();
        const slotEnd = nextSlot.toJSDate();

        const isOccupied = bookings.some((b) => {
          return slotStart < b.endTime && slotEnd > b.startTime;
        });

        if (!isOccupied) {
          freeSlots.push({
            startTime: currentSlot.toISO()!,
            endTime: nextSlot.toISO()!,
          });
        }

        currentSlot = nextSlot;
      }
    }

    return {
      roomId,
      roomName: room.name,
      roomStatus: room.status,
      date: day.toISODate(),
      timezone: config.officeTimezone,
      businessHours: {
        start: config.businessHoursStart,
        end: config.businessHoursEnd,
      },
      isBusinessDay,
      busySlots,
      freeSlots,
    };
  }

  async create(dto: CreateRoomDto) {
    const existing = await this.roomRepository.findOne({
      where: { name: dto.name.trim(), deletedAt: IsNull() },
    });
    if (existing) {
      throw new ConflictException(`A room with the name "${dto.name}" already exists.`);
    }

    // Auto-assign accent color from palette if omitted
    let accentColor = dto.accentColor;
    if (!accentColor) {
      const count = await this.roomRepository.count();
      accentColor = ACCENT_PALETTE[count % ACCENT_PALETTE.length];
    }

    const room = this.roomRepository.create({
      name: dto.name.trim(),
      floorOrLocation: dto.floorOrLocation.trim(),
      capacity: dto.capacity,
      description: dto.description?.trim() || null,
      amenities: dto.amenities || [],
      status: dto.status || RoomStatus.ACTIVE,
      accentColor,
    });

    try {
      return await this.roomRepository.save(room);
    } catch (err: any) {
      if (err.code === '23505' || err.message?.includes('duplicate key') || err.message?.includes('unique constraint')) {
        throw new ConflictException(`A room with the name "${dto.name}" already exists.`);
      }
      throw err;
    }
  }

  async update(id: string, dto: UpdateRoomDto) {
    const room = await this.roomRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });
    if (!room) {
      throw new NotFoundException(`Room with ID ${id} not found.`);
    }

    if (dto.name && dto.name.trim() !== room.name) {
      const existing = await this.roomRepository.findOne({
        where: { name: dto.name.trim(), deletedAt: IsNull() },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(`A room with the name "${dto.name}" already exists.`);
      }
      room.name = dto.name.trim();
    }

    if (dto.floorOrLocation) room.floorOrLocation = dto.floorOrLocation.trim();
    if (dto.capacity !== undefined) room.capacity = dto.capacity;
    if (dto.description !== undefined) room.description = dto.description?.trim() || null;
    if (dto.amenities) room.amenities = dto.amenities;
    if (dto.status) room.status = dto.status;
    if (dto.accentColor) room.accentColor = dto.accentColor;

    try {
      return await this.roomRepository.save(room);
    } catch (err: any) {
      if (err.code === '23505' || err.message?.includes('duplicate key') || err.message?.includes('unique constraint')) {
        const name = dto.name || room.name;
        throw new ConflictException(`A room with the name "${name}" already exists.`);
      }
      throw err;
    }
  }

  /**
   * Soft-deletes a room. If future bookings exist, requires ?cancelFutureBookings=true.
   */
  async delete(id: string, cancelFutureBookings: boolean, adminUserId: string) {
    const room = await this.roomRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });
    if (!room) {
      throw new NotFoundException(`Room with ID ${id} not found.`);
    }

    const now = new Date();
    const futureBookings = await this.bookingRepository.find({
      where: {
        roomId: id,
        status: BookingStatus.CONFIRMED,
      },
      relations: ['user'],
    });

    const activeFutureBookings = futureBookings.filter((b) => b.startTime > now);

    if (activeFutureBookings.length > 0 && !cancelFutureBookings) {
      throw new BadRequestException({
        message: `This room has ${activeFutureBookings.length} future confirmed booking(s). Confirm cancellation by passing cancelFutureBookings=true.`,
        futureBookingsCount: activeFutureBookings.length,
      });
    }

    // Execute soft delete and cancellation in an atomic transaction
    await this.dataSource.transaction(async (manager) => {
      // 1. Soft delete the room
      room.deletedAt = new Date();
      await manager.save(room);

      // 2. Cancel future bookings and notify owners if any
      if (activeFutureBookings.length > 0) {
        for (const b of activeFutureBookings) {
          b.status = BookingStatus.CANCELLED;
          b.cancelledAt = new Date();
          b.cancelledBy = adminUserId;
          b.cancellationReason = `Room "${room.name}" was deactivated/deleted by an administrator.`;
          await manager.save(b);

          // Dispatch notification
          const notif = manager.create(Notification, {
            userId: b.userId,
            type: NotificationType.ROOM_UNAVAILABLE,
            title: 'Room Unavailable - Meeting Cancelled',
            message: `Your booking "${b.title}" scheduled for ${b.startTime.toISOString()} in ${room.name} has been cancelled because the room was removed by administration.`,
            bookingId: b.id,
            isRead: false,
          });
          await manager.save(notif);
        }
      }
    });

    return {
      message: `Room "${room.name}" successfully deleted.`,
      cancelledBookingsCount: activeFutureBookings.length,
    };
  }
}
