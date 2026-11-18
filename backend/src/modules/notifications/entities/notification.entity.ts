import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Booking } from '../../bookings/entities/booking.entity';

export enum NotificationType {
  BOOKING_CONFIRMED = 'BOOKING_CONFIRMED',
  BOOKING_RESCHEDULED = 'BOOKING_RESCHEDULED',
  BOOKING_CANCELLED = 'BOOKING_CANCELLED',
  BOOKING_CANCELLED_BY_ADMIN = 'BOOKING_CANCELLED_BY_ADMIN',
  BOOKING_REMINDER = 'BOOKING_REMINDER',
  ROOM_UNAVAILABLE = 'ROOM_UNAVAILABLE',
}

@Entity('notifications')
@Index(['userId', 'isRead', 'createdAt'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, (user) => user.notifications, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({
    type: 'enum',
    enum: NotificationType,
  })
  type!: NotificationType;

  @Column({ type: 'varchar', length: 200 })
  title!: string;

  @Column({ type: 'text' })
  message!: string;

  @Column({ name: 'booking_id', type: 'uuid', nullable: true })
  bookingId?: string | null;

  @ManyToOne(() => Booking, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'booking_id' })
  booking?: Booking | null;

  @Column({ name: 'is_read', type: 'boolean', default: false })
  isRead!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
