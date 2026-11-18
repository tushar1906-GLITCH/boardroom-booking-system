import api from './client';
import {
  OverviewStats,
  DailyBookingStat,
  RoomUtilizationStat,
  PeakHourStat,
  EmployeeMeStats,
} from './types';

export const statsApi = {
  getOverview: async () => {
    const { data } = await api.get<OverviewStats>('/stats/overview');
    return data;
  },

  getBookingsPerDay: async (days: number = 30) => {
    const { data } = await api.get<DailyBookingStat[]>('/stats/bookings-per-day', {
      params: { days },
    });
    return data;
  },

  getRoomUtilization: async () => {
    const { data } = await api.get<RoomUtilizationStat[]>('/stats/room-utilization');
    return data;
  },

  getPeakHours: async () => {
    const { data } = await api.get<PeakHourStat[]>('/stats/peak-hours');
    return data;
  },

  getTopRooms: async () => {
    const { data } = await api.get<RoomUtilizationStat[]>('/stats/top-rooms');
    return data;
  },

  getMeStats: async () => {
    const { data } = await api.get<EmployeeMeStats>('/stats/me');
    return data;
  },
};
