import api from './client';
import { Room, PaginatedResponse, RoomAvailabilityResponse } from './types';

export interface RoomFilterParams {
  search?: string;
  minCapacity?: number;
  maxCapacity?: number;
  amenities?: string;
  status?: string;
  availableFrom?: string;
  availableTo?: string;
  sort?: string;
  page?: number;
  pageSize?: number;
}

export const roomsApi = {
  getRooms: async (params?: RoomFilterParams) => {
    const { data } = await api.get<PaginatedResponse<Room>>('/rooms', { params });
    return data;
  },

  getRoomById: async (id: string) => {
    const { data } = await api.get<Room>(`/rooms/${id}`);
    return data;
  },

  getRoomAvailability: async (id: string, date: string) => {
    const { data } = await api.get<RoomAvailabilityResponse>(`/rooms/${id}/availability`, {
      params: { date },
    });
    return data;
  },

  createRoom: async (payload: Partial<Room>) => {
    const { data } = await api.post<Room>('/rooms', payload);
    return data;
  },

  updateRoom: async (id: string, payload: Partial<Room>) => {
    const { data } = await api.patch<Room>(`/rooms/${id}`, payload);
    return data;
  },

  deleteRoom: async (id: string, cancelFutureBookings?: boolean) => {
    const { data } = await api.delete<{ message: string; cancelledBookingsCount: number }>(
      `/rooms/${id}`,
      {
        params: { cancelFutureBookings: cancelFutureBookings ? 'true' : 'false' },
      },
    );
    return data;
  },
};
