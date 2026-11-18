import { validateBookingTiming, BookingValidationConfig } from './date-time.util';
import { BadRequestException } from '@nestjs/common';
import { DateTime } from 'luxon';

describe('DateTime & Booking Timing Validator (Unit Tests)', () => {
  const config: BookingValidationConfig = {
    officeTimezone: 'Asia/Kolkata',
    businessHoursStart: '07:00',
    businessHoursEnd: '22:00',
    businessDays: [1, 2, 3, 4, 5, 6, 7], // Mon to Sun
  };

  // Helper to get next Monday in Asia/Kolkata
  const getNextBusinessDay = () => {
    let dt = DateTime.now().setZone('Asia/Kolkata').plus({ days: 1 });
    while (!config.businessDays.includes(dt.weekday)) {
      dt = dt.plus({ days: 1 });
    }
    return dt;
  };

  it('should accept valid 30-minute aligned booking within business hours', () => {
    const targetDay = getNextBusinessDay();
    const start = targetDay.set({ hour: 10, minute: 0, second: 0, millisecond: 0 });
    const end = targetDay.set({ hour: 11, minute: 0, second: 0, millisecond: 0 });

    const result = validateBookingTiming(start.toJSDate(), end.toJSDate(), config);
    expect(result.startTz).toBeDefined();
    expect(result.endTz).toBeDefined();
  });

  it('should reject unaligned start time (e.g. 10:15)', () => {
    const targetDay = getNextBusinessDay();
    const start = targetDay.set({ hour: 10, minute: 15, second: 0, millisecond: 0 });
    const end = targetDay.set({ hour: 11, minute: 0, second: 0, millisecond: 0 });

    expect(() => validateBookingTiming(start.toJSDate(), end.toJSDate(), config)).toThrow(
      BadRequestException,
    );
  });

  it('should reject unaligned end time (e.g. 10:45)', () => {
    const targetDay = getNextBusinessDay();
    const start = targetDay.set({ hour: 10, minute: 0, second: 0, millisecond: 0 });
    const end = targetDay.set({ hour: 10, minute: 45, second: 0, millisecond: 0 });

    expect(() => validateBookingTiming(start.toJSDate(), end.toJSDate(), config)).toThrow(
      BadRequestException,
    );
  });

  it('should reject end time before or equal to start time', () => {
    const targetDay = getNextBusinessDay();
    const start = targetDay.set({ hour: 10, minute: 0, second: 0, millisecond: 0 });
    const end = targetDay.set({ hour: 9, minute: 30, second: 0, millisecond: 0 });

    expect(() => validateBookingTiming(start.toJSDate(), end.toJSDate(), config)).toThrow(
      BadRequestException,
    );
  });

  it('should reject duration under 30 minutes', () => {
    const targetDay = getNextBusinessDay();
    const start = targetDay.set({ hour: 10, minute: 0, second: 0, millisecond: 0 });
    const end = targetDay.set({ hour: 10, minute: 10, second: 0, millisecond: 0 });

    expect(() => validateBookingTiming(start.toJSDate(), end.toJSDate(), config)).toThrow(
      BadRequestException,
    );
  });

  it('should reject duration over 4 hours (e.g. 5 hours)', () => {
    const targetDay = getNextBusinessDay();
    const start = targetDay.set({ hour: 9, minute: 0, second: 0, millisecond: 0 });
    const end = targetDay.set({ hour: 14, minute: 30, second: 0, millisecond: 0 }); // 5.5 hours

    expect(() => validateBookingTiming(start.toJSDate(), end.toJSDate(), config)).toThrow(
      'Meeting duration cannot exceed 4 hours (240 minutes).',
    );
  });

  it('should reject start time in the past', () => {
    const past = DateTime.now().setZone('Asia/Kolkata').minus({ days: 1 }).set({ hour: 10, minute: 0, second: 0, millisecond: 0 });
    const pastEnd = past.plus({ minutes: 60 });

    expect(() => validateBookingTiming(past.toJSDate(), pastEnd.toJSDate(), config)).toThrow(
      'Meeting start_time must be in the future.',
    );
  });

  it('should reject bookings more than 90 days ahead', () => {
    const farFuture = DateTime.now().setZone('Asia/Kolkata').plus({ days: 95 }).set({ hour: 10, minute: 0, second: 0, millisecond: 0 });
    const farFutureEnd = farFuture.plus({ minutes: 60 });

    expect(() => validateBookingTiming(farFuture.toJSDate(), farFutureEnd.toJSDate(), config)).toThrow(
      'Meetings cannot be booked more than 90 days in advance.',
    );
  });

  it('should reject bookings outside business hours (e.g. 06:30 or 22:30)', () => {
    const targetDay = getNextBusinessDay();
    // Before 07:00
    const earlyStart = targetDay.set({ hour: 6, minute: 30, second: 0, millisecond: 0 });
    const earlyEnd = targetDay.set({ hour: 7, minute: 30, second: 0, millisecond: 0 });
    expect(() => validateBookingTiming(earlyStart.toJSDate(), earlyEnd.toJSDate(), config)).toThrow(
      BadRequestException,
    );

    // After 22:00
    const lateStart = targetDay.set({ hour: 21, minute: 30, second: 0, millisecond: 0 });
    const lateEnd = targetDay.set({ hour: 22, minute: 30, second: 0, millisecond: 0 });
    expect(() => validateBookingTiming(lateStart.toJSDate(), lateEnd.toJSDate(), config)).toThrow(
      BadRequestException,
    );
  });

  it('should reject bookings that cross midnight', () => {
    const targetDay = getNextBusinessDay();
    const start = targetDay.set({ hour: 23, minute: 30, second: 0, millisecond: 0 });
    const nextDay = targetDay.plus({ days: 1 });
    const end = nextDay.set({ hour: 0, minute: 30, second: 0, millisecond: 0 });

    expect(() => validateBookingTiming(start.toJSDate(), end.toJSDate(), config)).toThrow(
      'Meetings cannot span across midnight.',
    );
  });
});
