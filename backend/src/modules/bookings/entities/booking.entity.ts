import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Room } from '../../rooms/entities/room.entity';
import { User } from '../../users/entities/user.entity';

export enum BookingStatus {
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
}

@Entity('bookings')
@Index(['userId', 'startTime'])
@Index(['roomId', 'startTime'])
export class Booking {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'room_id', type: 'uuid' })
  roomId!: string;

  @ManyToOne(() => Room, (room) => room.bookings, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'room_id' })
  room!: Room;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, (user) => user.bookings, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'varchar', length: 120 })
  title!: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description?: string | null;

  @Column({ name: 'attendee_count', type: 'int' })
  attendeeCount!: number;

  @Column({ name: 'start_time', type: 'timestamptz' })
  startTime!: Date;

  @Column({ name: 'end_time', type: 'timestamptz' })
  endTime!: Date;

  @Column({
    type: 'enum',
    enum: BookingStatus,
    default: BookingStatus.CONFIRMED,
  })
  status!: BookingStatus;

  @Column({ name: 'reminder_minutes_before', type: 'int', default: 15 })
  reminderMinutesBefore!: number;

  @Column({ name: 'reminder_sent_at', type: 'timestamptz', nullable: true })
  reminderSentAt?: Date | null;

  @Column({ name: 'reschedule_count', type: 'int', default: 0 })
  rescheduleCount!: number;

  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt?: Date | null;

  @Column({ name: 'cancelled_by', type: 'uuid', nullable: true })
  cancelledBy?: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'cancelled_by' })
  cancelledByUser?: User | null;

  @Column({ name: 'cancellation_reason', type: 'varchar', length: 500, nullable: true })
  cancellationReason?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
