import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Booking } from '../../bookings/entities/booking.entity';

export enum RoomStatus {
  ACTIVE = 'ACTIVE',
  MAINTENANCE = 'MAINTENANCE',
}

@Entity('rooms')
export class Room {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ name: 'floor_or_location', type: 'varchar', length: 100 })
  floorOrLocation!: string;

  @Column({ type: 'int' })
  @Index('idx_rooms_capacity')
  capacity!: number;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ type: 'text', array: true, default: '{}' })
  amenities!: string[];

  @Column({
    type: 'enum',
    enum: RoomStatus,
    default: RoomStatus.ACTIVE,
  })
  status!: RoomStatus;

  @Column({ name: 'accent_color', type: 'varchar', length: 10 })
  accentColor!: string;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt?: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => Booking, (booking) => booking.room)
  bookings!: Booking[];
}
