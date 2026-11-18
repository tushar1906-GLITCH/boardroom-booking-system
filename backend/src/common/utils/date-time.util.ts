import { DateTime } from 'luxon';
import { BadRequestException } from '@nestjs/common';

export interface BookingValidationConfig {
  officeTimezone: string;
  businessHoursStart: string; // e.g. "08:00"
  businessHoursEnd: string;   // e.g. "20:00"
  businessDays: number[];      // e.g. [1, 2, 3, 4, 5] (Monday=1, Sunday=7)
}

export function getDefaultTimeConfig(): BookingValidationConfig {
  const officeTimezone = process.env.OFFICE_TIMEZONE || 'Asia/Kolkata';
  const businessHoursStart = process.env.BUSINESS_HOURS_START || '08:00';
  const businessHoursEnd = process.env.BUSINESS_HOURS_END || '20:00';
  const businessDays = (process.env.BUSINESS_DAYS || '1,2,3,4,5')
    .split(',')
    .map((d) => parseInt(d.trim(), 10))
    .filter((n) => !isNaN(n));

  return {
    officeTimezone,
    businessHoursStart,
    businessHoursEnd,
    businessDays,
  };
}

/**
 * Validates all business rules for booking start and end timestamps.
 * Throws a descriptive BadRequestException on any violation.
 */
export function validateBookingTiming(
  startTimeInput: Date | string,
  endTimeInput: Date | string,
  config: BookingValidationConfig = getDefaultTimeConfig(),
): { startTz: DateTime; endTz: DateTime } {
  const startTz = DateTime.fromJSDate(new Date(startTimeInput)).setZone(config.officeTimezone);
  const endTz = DateTime.fromJSDate(new Date(endTimeInput)).setZone(config.officeTimezone);

  if (!startTz.isValid || !endTz.isValid) {
    throw new BadRequestException('Invalid start_time or end_time ISO timestamp.');
  }

  // 1. End must be after start
  if (endTz <= startTz) {
    throw new BadRequestException('Meeting end_time must be strictly after start_time.');
  }

  // 2. 30-minute grid alignment
  const isStartAligned =
    (startTz.minute === 0 || startTz.minute === 30) &&
    startTz.second === 0 &&
    startTz.millisecond === 0;

  const isEndAligned =
    (endTz.minute === 0 || endTz.minute === 30) &&
    endTz.second === 0 &&
    endTz.millisecond === 0;

  if (!isStartAligned || !isEndAligned) {
    throw new BadRequestException(
      'Meeting start and end times must be aligned to 30-minute boundaries (e.g. 10:00, 10:30).',
    );
  }

  // 3. Duration: min 30 minutes, max 4 hours (240 minutes)
  const durationMinutes = endTz.diff(startTz, 'minutes').minutes;
  if (durationMinutes < 30) {
    throw new BadRequestException('Meeting duration must be at least 30 minutes.');
  }
  if (durationMinutes > 240) {
    throw new BadRequestException('Meeting duration cannot exceed 4 hours (240 minutes).');
  }

  // 4. Must not cross midnight (must be on the exact same calendar day in the office timezone)
  if (!startTz.hasSame(endTz, 'day')) {
    throw new BadRequestException('Meetings cannot span across midnight.');
  }

  // 5. Must be in the future (not in the past)
  const nowTz = DateTime.now().setZone(config.officeTimezone);
  if (startTz < nowTz) {
    throw new BadRequestException('Meeting start_time must be in the future.');
  }

  // 6. Max 90 days ahead
  const maxFutureDate = nowTz.plus({ days: 90 });
  if (startTz > maxFutureDate) {
    throw new BadRequestException('Meetings cannot be booked more than 90 days in advance.');
  }

  // 7. Business day check (e.g. Mon-Fri)
  if (!config.businessDays.includes(startTz.weekday)) {
    throw new BadRequestException(
      `Meetings can only be scheduled on business days (${config.businessDays.join(', ')}).`,
    );
  }

  // 8. Business hours check (e.g. 08:00 - 20:00)
  const [bStartH, bStartM] = config.businessHoursStart.split(':').map((v) => parseInt(v, 10));
  const [bEndH, bEndM] = config.businessHoursEnd.split(':').map((v) => parseInt(v, 10));

  const officeDayStart = startTz.set({
    hour: bStartH,
    minute: bStartM,
    second: 0,
    millisecond: 0,
  });
  const officeDayEnd = startTz.set({
    hour: bEndH,
    minute: bEndM,
    second: 0,
    millisecond: 0,
  });

  if (startTz < officeDayStart || endTz > officeDayEnd) {
    throw new BadRequestException(
      `Meetings must fall within business hours (${config.businessHoursStart} - ${config.businessHoursEnd} ${config.officeTimezone}).`,
    );
  }

  return { startTz, endTz };
}
