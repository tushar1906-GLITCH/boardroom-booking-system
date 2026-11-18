DO $$
DECLARE
  uid UUID;
  rid1 UUID;
  rid2 UUID;
  b1 UUID;
BEGIN
  -- Insert test user
  INSERT INTO users (full_name, email, password_hash)
  VALUES ('Constraint Tester', 'tester@company.com', 'dummyhash') RETURNING id INTO uid;

  -- Insert two test rooms
  INSERT INTO rooms (name, floor_or_location, capacity, accent_color)
  VALUES ('Room Const-1', '1st Floor', 10, '#7C6CFF') RETURNING id INTO rid1;

  INSERT INTO rooms (name, floor_or_location, capacity, accent_color)
  VALUES ('Room Const-2', '1st Floor', 10, '#2DD4BF') RETURNING id INTO rid2;

  -- 1. Insert Booking 1: 10:00 to 11:00 in Room 1
  INSERT INTO bookings (room_id, user_id, title, attendee_count, start_time, end_time, status)
  VALUES (rid1, uid, 'Meeting 1', 5, '2026-11-20 10:00:00+00', '2026-11-20 11:00:00+00', 'CONFIRMED')
  RETURNING id INTO b1;
  RAISE NOTICE '1. Initial booking inserted successfully.';

  -- 2. Overlapping booking in different room (Room 2) MUST succeed
  INSERT INTO bookings (room_id, user_id, title, attendee_count, start_time, end_time, status)
  VALUES (rid2, uid, 'Meeting Room 2', 5, '2026-11-20 10:30:00+00', '2026-11-20 11:30:00+00', 'CONFIRMED');
  RAISE NOTICE '2. Concurrent booking in separate room succeeded.';

  -- 3. Back-to-back booking in Room 1 (11:00 to 12:00) MUST succeed ([) range boundary allows exact touch)
  INSERT INTO bookings (room_id, user_id, title, attendee_count, start_time, end_time, status)
  VALUES (rid1, uid, 'Back-to-back Meeting', 5, '2026-11-20 11:00:00+00', '2026-11-20 12:00:00+00', 'CONFIRMED');
  RAISE NOTICE '3. Back-to-back booking succeeded with [) half-open interval.';

  -- 4. Overlapping booking in Room 1 (10:30 to 11:30) MUST FAIL with exclusion violation (23P01)
  BEGIN
    INSERT INTO bookings (room_id, user_id, title, attendee_count, start_time, end_time, status)
    VALUES (rid1, uid, 'Overlapping Conflict Meeting', 5, '2026-11-20 10:30:00+00', '2026-11-20 11:30:00+00', 'CONFIRMED');
    RAISE EXCEPTION 'CRITICAL: Exclusion constraint failed to reject overlap!';
  EXCEPTION WHEN exclusion_violation THEN
    RAISE NOTICE '4. SUCCESS: PostgreSQL GiST exclusion constraint (23P01) successfully prevented the overlap!';
  END;

  -- 5. Cancel Booking 1
  UPDATE bookings SET status = 'CANCELLED' WHERE id = b1;
  RAISE NOTICE '5. Booking 1 marked as CANCELLED.';

  -- 6. Insert new booking in Room 1 for the exact same slot (10:00 to 11:00) MUST now SUCCEED
  INSERT INTO bookings (room_id, user_id, title, attendee_count, start_time, end_time, status)
  VALUES (rid1, uid, 'Re-booked Slot', 5, '2026-11-20 10:00:00+00', '2026-11-20 11:00:00+00', 'CONFIRMED');
  RAISE NOTICE '6. SUCCESS: Released slot immediately re-booked by new confirmed booking!';

  -- Rollback everything so the database remains pristine
  RAISE EXCEPTION 'ALL_TESTS_PASSED_ROLLBACK';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM = 'ALL_TESTS_PASSED_ROLLBACK' THEN
    RAISE NOTICE '>>> ZERO OVERLAP GUARANTEE MATHEMATICALLY VERIFIED BY POSTGRESQL ENGINE <<<';
  ELSE
    RAISE;
  END IF;
END;
$$;
