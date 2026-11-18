import api from './client';
import { User } from './types';

export const authApi = {
  register: async (payload: { fullName: string; email: string; password: string; department?: string }) => {
    const { data } = await api.post<{ user: User; accessToken: string }>('/auth/register', payload);
    return data;
  },

  login: async (payload: { email: string; password: string }) => {
    const { data } = await api.post<{ user: User; accessToken: string }>('/auth/login', payload);
    return data;
  },

  refresh: async () => {
    const { data } = await api.post<{ user: User; accessToken: string }>('/auth/refresh');
    return data;
  },

  logout: async () => {
    const { data } = await api.post('/auth/logout');
    return data;
  },

  getMe: async () => {
    const { data } = await api.get<User>('/auth/me');
    return data;
  },

  updateMe: async (payload: { fullName?: string; department?: string }) => {
    const { data } = await api.patch<User>('/auth/me', payload);
    return data;
  },

  changePassword: async (payload: { currentPassword: string; newPassword: string }) => {
    const { data } = await api.patch<{ message: string }>('/auth/change-password', payload);
    return data;
  },
};
