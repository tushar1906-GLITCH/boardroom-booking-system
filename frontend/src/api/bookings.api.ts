import api from './client';
import { Booking, PaginatedResponse } from './types';

export interface BookingFilterParams {
  scope?: 'upcoming' | 'past' | 'cancelled' | 'all';
  search?: string;
  roomId?: string;
  userId?: string;
  status?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateBookingPayload {
  roomId: string;
  title: string;
  description?: string;
  attendeeCount: number;
  startTime: string;
  endTime: string;
  reminderMinutesBefore?: number;
}

export interface RescheduleBookingPayload {
  roomId?: string;
  startTime: string;
  endTime: string;
}

export interface CalendarEventItem {
  id: string;
  title: string;
  start: string;
  end: string;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  extendedProps: {
    bookingId: string;
    roomId: string;
    roomName: string;
    roomLocation: string;
    organizerId: string;
    organizer: string;
    organizerEmail: string;
    attendeeCount: number;
    description?: string;
    status: string;
  };
}

export const bookingsApi = {
  createBooking: async (payload: CreateBookingPayload) => {
    const { data } = await api.post<Booking>('/bookings', payload);
    return data;
  },

  getMyBookings: async (params?: BookingFilterParams) => {
    const { data } = await api.get<PaginatedResponse<Booking>>('/bookings/mine', { params });
    return data;
  },

  getBookingById: async (id: string) => {
    const { data } = await api.get<Booking>(`/bookings/${id}`);
    return data;
  },

  rescheduleBooking: async (id: string, payload: RescheduleBookingPayload) => {
    const { data } = await api.patch<Booking>(`/bookings/${id}/reschedule`, payload);
    return data;
  },

  cancelBooking: async (id: string, reason?: string) => {
    const { data } = await api.patch<Booking>(`/bookings/${id}/cancel`, { reason });
    return data;
  },

  getCalendarEvents: async (from: string, to: string, roomIds?: string) => {
    const { data } = await api.get<CalendarEventItem[]>('/bookings/calendar', {
      params: { from, to, roomIds },
    });
    return data;
  },

  getAllBookingsAdmin: async (params?: BookingFilterParams) => {
    const { data } = await api.get<PaginatedResponse<Booking>>('/bookings', { params });
    return data;
  },
};
