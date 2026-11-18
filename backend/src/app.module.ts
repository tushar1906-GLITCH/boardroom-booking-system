import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';

import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RoomsModule } from './modules/rooms/rooms.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { RemindersModule } from './modules/reminders/reminders.module';
import { StatsModule } from './modules/stats/stats.module';
import { HealthModule } from './modules/health/health.module';

import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: process.env.DATABASE_URL || config.get<string>('DATABASE_URL') || 'postgresql://postgres:postgres@localhost:5433/meeting_room_booking_db',
        autoLoadEntities: true,
        synchronize: false, // MANDATORY: Schema changes are managed exclusively through migrations
        logging: config.get<string>('NODE_ENV') === 'development' ? ['error', 'warn'] : ['error'],
      }),
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 120, // 120 requests per minute
      },
    ]),
    ScheduleModule.forRoot(),
    AuthModule,
    UsersModule,
    RoomsModule,
    BookingsModule,
    NotificationsModule,
    RemindersModule,
    StatsModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule {}
