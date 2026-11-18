import api from './client';
import { User, PaginatedResponse } from './types';

export const usersApi = {
  getUsers: async (params?: { page?: number; pageSize?: number; search?: string; role?: string }) => {
    const { data } = await api.get<PaginatedResponse<User>>('/users', { params });
    return data;
  },

  getUserById: async (id: string) => {
    const { data } = await api.get<User>(`/users/${id}`);
    return data;
  },

  updateUser: async (id: string, payload: { role?: string; isActive?: boolean }) => {
    const { data } = await api.patch<User>(`/users/${id}`, payload);
    return data;
  },
};
