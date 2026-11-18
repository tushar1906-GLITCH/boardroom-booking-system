export type UserRole = 'EMPLOYEE' | 'ADMIN';
export type RoomStatus = 'ACTIVE' | 'MAINTENANCE';
export type BookingStatus = 'CONFIRMED' | 'CANCELLED';
export type NotificationType =
  | 'BOOKING_CONFIRMED'
  | 'BOOKING_RESCHEDULED'
  | 'BOOKING_CANCELLED'
  | 'BOOKING_CANCELLED_BY_ADMIN'
  | 'BOOKING_REMINDER'
  | 'ROOM_UNAVAILABLE';

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  department?: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface BookingSummary {
  id: string;
  title: string;
  organizer: string;
  startTime: string;
  endTime: string;
}

export interface Room {
  id: string;
  name: string;
  floorOrLocation: string;
  capacity: number;
  description?: string | null;
  amenities: string[];
  status: RoomStatus;
  accentColor: string;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  isAvailableNow?: boolean;
  currentBooking?: BookingSummary | null;
  nextBooking?: BookingSummary | null;
}

export interface Booking {
  id: string;
  roomId: string;
  room: Room;
  userId: string;
  user: User;
  title: string;
  description?: string | null;
  attendeeCount: number;
  startTime: string;
  endTime: string;
  status: BookingStatus;
  reminderMinutesBefore: number;
  reminderSentAt?: string | null;
  rescheduleCount: number;
  cancelledAt?: string | null;
  cancelledBy?: string | null;
  cancelledByUser?: User | null;
  cancellationReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  bookingId?: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface PaginatedMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginatedMeta;
}

export interface FreeSlot {
  startTime: string;
  endTime: string;
}

export interface BusySlot {
  id: string;
  title: string;
  organizer: string;
  startTime: string;
  endTime: string;
}

export interface RoomAvailabilityResponse {
  roomId: string;
  roomName: string;
  roomStatus: RoomStatus;
  date: string;
  timezone: string;
  businessHours: {
    start: string;
    end: string;
  };
  isBusinessDay: boolean;
  busySlots: BusySlot[];
  freeSlots: FreeSlot[];
}

export interface OverviewStats {
  totalRooms: number;
  bookingsToday: number;
  upcomingBookings: number;
  totalBookingsLast30Days: number;
  cancelledBookingsLast30Days: number;
  cancellationRate: number;
  totalBookedHours: number;
  averageRoomUtilization: number;
}

export interface DailyBookingStat {
  date: string;
  confirmed: number;
  cancelled: number;
  total: number;
}

export interface RoomUtilizationStat {
  roomId: string;
  roomName: string;
  accentColor: string;
  capacity: number;
  totalBookings: number;
  totalHours: number;
  utilizationPercentage: number;
}

export interface PeakHourStat {
  day: number;
  dayName: string;
  hour: number;
  count: number;
}

export interface EmployeeMeStats {
  nextMeeting: {
    id: string;
    title: string;
    roomName: string;
    floorOrLocation: string;
    accentColor: string;
    startTime: string;
    endTime: string;
    attendeeCount: number;
  } | null;
  bookingsThisWeek: number;
  hoursBookedThisMonth: number;
  totalMeetingsAttended: number;
}
