import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Booking } from '../bookings/entities/booking.entity';
import { Notification, NotificationType } from '../notifications/entities/notification.entity';
import { Room } from '../rooms/entities/room.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(
    private dataSource: DataSource,
    private configService: ConfigService,
  ) {
    const smtpHost = this.configService.get<string>('SMTP_HOST');
    if (smtpHost) {
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(this.configService.get<string>('SMTP_PORT') || '587', 10),
        secure: false,
        auth: {
          user: this.configService.get<string>('SMTP_USER') || '',
          pass: this.configService.get<string>('SMTP_PASS') || '',
        },
      });
      this.logger.log('SMTP transporter initialized.');
    }
  }

  /**
   * Cron job running every minute to process due reminders.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async handleCronReminders() {
    await this.processReminders();
  }

  /**
   * Atomically claims and dispatches notifications for upcoming bookings.
   * Can be invoked directly during tests.
   */
  async processReminders(): Promise<number> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let claimedBookings: any[] = [];
    try {
      // ATOMIC CLAIM: Update reminder_sent_at with SKIP LOCKED to avoid double-processing
      const rawResult = await queryRunner.query(`
        UPDATE bookings
        SET reminder_sent_at = now()
        WHERE id IN (
          SELECT id FROM bookings
          WHERE status = 'CONFIRMED'
            AND reminder_sent_at IS NULL
            AND reminder_minutes_before > 0
            AND start_time > now()
            AND start_time - (reminder_minutes_before * interval '1 minute') <= now()
          FOR UPDATE SKIP LOCKED
        )
        RETURNING *;
      `);

      // In TypeORM PostgreSQL driver, UPDATE RETURNING returns [ rows, count ]
      claimedBookings = Array.isArray(rawResult?.[0])
        ? rawResult[0]
        : Array.isArray(rawResult)
        ? rawResult
        : [];

      await queryRunner.commitTransaction();
    } catch (err: any) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to claim reminder bookings: ${err.message}`, err.stack);
      return 0;
    } finally {
      await queryRunner.release();
    }

    if (!claimedBookings || claimedBookings.length === 0) {
      return 0;
    }

    this.logger.log(`Claimed ${claimedBookings.length} booking(s) for immediate reminder dispatch.`);

    for (const rawBooking of claimedBookings) {
      try {
        const room = await this.dataSource.getRepository(Room).findOne({ where: { id: rawBooking.room_id } });
        const user = await this.dataSource.getRepository(User).findOne({ where: { id: rawBooking.user_id } });

        const roomName = room ? room.name : 'Meeting Room';
        const minutesBefore = rawBooking.reminder_minutes_before;

        // 1. Insert in-app notification
        const notif = this.dataSource.getRepository(Notification).create({
          userId: rawBooking.user_id,
          type: NotificationType.BOOKING_REMINDER,
          title: 'Upcoming Meeting Reminder',
          message: `Your meeting "${rawBooking.title}" in ${roomName} starts in approximately ${minutesBefore} minutes.`,
          bookingId: rawBooking.id,
          isRead: false,
        });
        await this.dataSource.getRepository(Notification).save(notif);

        // 2. Dispatch optional email if SMTP is configured
        if (this.transporter && user && user.email) {
          await this.transporter.sendMail({
            from: this.configService.get<string>('SMTP_FROM') || 'no-reply@company.com',
            to: user.email,
            subject: `Reminder: "${rawBooking.title}" starts in ${minutesBefore} minutes`,
            html: `
              <div style="font-family: sans-serif; color: #1E293B;">
                <h2>Meeting Reminder</h2>
                <p>Hello ${user.fullName},</p>
                <p>This is a reminder that your meeting <strong>${rawBooking.title}</strong> is scheduled to start soon.</p>
                <ul>
                  <li><strong>Room:</strong> ${roomName}</li>
                  <li><strong>Start:</strong> ${new Date(rawBooking.start_time).toLocaleString()}</li>
                  <li><strong>End:</strong> ${new Date(rawBooking.end_time).toLocaleString()}</li>
                </ul>
                <p>Have a productive session!</p>
              </div>
            `,
          }).catch((mailErr) => {
            this.logger.warn(`Failed to dispatch reminder email to ${user.email}: ${mailErr.message}`);
          });
        }
      } catch (err: any) {
        this.logger.error(`Error processing individual reminder for booking ${rawBooking.id}: ${err.message}`);
      }
    }

    return claimedBookings.length;
  }
}
