import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoomsService } from './rooms.service';
import { RoomsController } from './rooms.controller';
import { Room } from './entities/room.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { Notification } from '../notifications/entities/notification.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Room, Booking, Notification])],
  controllers: [RoomsController],
  providers: [RoomsService],
  exports: [RoomsService],
})
export class RoomsModule {}
