import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: 1700000000000-InitialSchema
 * Creates required PostgreSQL extensions, core tables, constraints,
 * and the mathematical GiST exclusion constraint preventing booking overlaps.
 */
export class InitialSchema1700000000000 implements MigrationInterface {
  name = 'InitialSchema1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Enable Required Extensions
    // btree_gist is required to combine equality (= on UUID) with range overlap (&& on tstzrange)
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS btree_gist;`);
    // citext is required for case-insensitive email comparison and uniqueness
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS citext;`);

    // 2. Users Table
    await queryRunner.query(`
      CREATE TABLE users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        full_name VARCHAR(120) NOT NULL,
        email CITEXT NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'EMPLOYEE' CHECK (role IN ('EMPLOYEE', 'ADMIN')),
        department VARCHAR(100),
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    // 3. Refresh Tokens Table (with rotation & cascade delete on user removal)
    await queryRunner.query(`
      CREATE TABLE refresh_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash VARCHAR(255) NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        revoked_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX idx_refresh_tokens_user_token ON refresh_tokens (user_id, token_hash);
    `);

    // 4. Rooms Table (soft-deletable, distinct capacity check, hex color)
    await queryRunner.query(`
      CREATE TABLE rooms (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        floor_or_location VARCHAR(100) NOT NULL,
        capacity INT NOT NULL CHECK (capacity > 0 AND capacity <= 500),
        description TEXT,
        amenities TEXT[] NOT NULL DEFAULT '{}',
        status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'MAINTENANCE')),
        accent_color VARCHAR(10) NOT NULL,
        deleted_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE UNIQUE INDEX rooms_name_unique ON rooms (lower(name)) WHERE deleted_at IS NULL;
      CREATE INDEX idx_rooms_capacity ON rooms (capacity);
    `);

    // 5. Bookings Table (with Core GiST Exclusion Constraint)
    await queryRunner.query(`
      CREATE TABLE bookings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE RESTRICT,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        title VARCHAR(120) NOT NULL,
        description VARCHAR(500),
        attendee_count INT NOT NULL CHECK (attendee_count > 0),
        start_time TIMESTAMPTZ NOT NULL,
        end_time TIMESTAMPTZ NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'CONFIRMED' CHECK (status IN ('CONFIRMED', 'CANCELLED')),
        reminder_minutes_before INT NOT NULL DEFAULT 15 CHECK (reminder_minutes_before IN (0, 10, 15, 30, 60)),
        reminder_sent_at TIMESTAMPTZ,
        reschedule_count INT NOT NULL DEFAULT 0,
        cancelled_at TIMESTAMPTZ,
        cancelled_by UUID REFERENCES users(id),
        cancellation_reason VARCHAR(500),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT check_end_after_start CHECK (end_time > start_time)
      );

      -- THE CORE GUARANTEE: Mathematical exclusion constraint preventing double booking
      -- Only active/confirmed bookings are guarded. Cancelled bookings are automatically excluded.
      ALTER TABLE bookings ADD CONSTRAINT bookings_no_overlap
      EXCLUDE USING gist (
        room_id WITH =,
        tstzrange(start_time, end_time, '[)') WITH &&
      )
      WHERE (status = 'CONFIRMED');

      CREATE INDEX idx_bookings_user_start ON bookings (user_id, start_time);
      CREATE INDEX idx_bookings_room_start ON bookings (room_id, start_time);
      -- Partial index for rapid scanning by the reminder cron job
      CREATE INDEX idx_bookings_active_reminder ON bookings (start_time)
      WHERE status = 'CONFIRMED' AND reminder_sent_at IS NULL;
    `);

    // 6. Notifications Table
    await queryRunner.query(`
      CREATE TABLE notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL CHECK (type IN (
          'BOOKING_CONFIRMED',
          'BOOKING_RESCHEDULED',
          'BOOKING_CANCELLED',
          'BOOKING_CANCELLED_BY_ADMIN',
          'BOOKING_REMINDER',
          'ROOM_UNAVAILABLE'
        )),
        title VARCHAR(200) NOT NULL,
        message TEXT NOT NULL,
        booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
        is_read BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX idx_notifications_user_read_created ON notifications (user_id, is_read, created_at DESC);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS notifications CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS bookings CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS rooms CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS refresh_tokens CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS users CASCADE;`);
  }
}
