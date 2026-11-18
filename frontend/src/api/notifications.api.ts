import api from './client';
import { NotificationItem, PaginatedResponse } from './types';

export const notificationsApi = {
  getNotifications: async (params?: { page?: number; pageSize?: number }) => {
    const { data } = await api.get<PaginatedResponse<NotificationItem>>('/notifications', { params });
    return data;
  },

  getUnreadCount: async () => {
    const { data } = await api.get<{ unreadCount: number }>('/notifications/unread-count');
    return data;
  },

  markAsRead: async (id: string) => {
    const { data } = await api.patch<NotificationItem>(`/notifications/${id}/read`);
    return data;
  },

  markAllAsRead: async () => {
    const { data } = await api.patch<{ message: string }>('/notifications/read-all');
    return data;
  },
};
