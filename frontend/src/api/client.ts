import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

// In-memory token storage (XSS resilient)
let inMemoryAccessToken: string | null = null;
let refreshSubscribers: ((token: string) => void)[] = [];
let isRefreshing = false;

export const getAccessToken = () => inMemoryAccessToken;

export const setAccessToken = (token: string | null) => {
  inMemoryAccessToken = token;
};

const onTokenRefreshed = (newToken: string) => {
  refreshSubscribers.forEach((cb) => cb(newToken));
  refreshSubscribers = [];
};

const addRefreshSubscriber = (cb: (token: string) => void) => {
  refreshSubscribers.push(cb);
};

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Send httpOnly refresh cookie
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach in-memory access token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (inMemoryAccessToken && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${inMemoryAccessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response Interceptor: Transparent Refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Avoid refresh loops on auth endpoints
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/register') &&
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      if (isRefreshing) {
        return new Promise((resolve) => {
          addRefreshSubscriber((token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(api(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true },
        );

        const newAccessToken = data.accessToken;
        setAccessToken(newAccessToken);
        isRefreshing = false;
        onTokenRefreshed(newAccessToken);

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshErr) {
        isRefreshing = false;
        setAccessToken(null);
        // Dispatch session expired event so UI can redirect cleanly
        window.dispatchEvent(new Event('auth:session-expired'));
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  },
);

export default api;
