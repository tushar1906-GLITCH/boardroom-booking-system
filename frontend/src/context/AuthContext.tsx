import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../api/types';
import { authApi } from '../api/auth.api';
import { setAccessToken } from '../api/client';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  register: (payload: { fullName: string; email: string; password: string; department?: string }) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updated: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize session on mount via httpOnly cookie refresh
  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      try {
        const data = await authApi.refresh();
        if (isMounted) {
          setAccessToken(data.accessToken);
          setUser(data.user);
        }
      } catch (err) {
        if (isMounted) {
          setAccessToken(null);
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initAuth();

    const handleSessionExpired = () => {
      setAccessToken(null);
      setUser(null);
    };

    window.addEventListener('auth:session-expired', handleSessionExpired);
    return () => {
      isMounted = false;
      window.removeEventListener('auth:session-expired', handleSessionExpired);
    };
  }, []);

  const login = async (credentials: { email: string; password: string }) => {
    const data = await authApi.login(credentials);
    setAccessToken(data.accessToken);
    setUser(data.user);
  };

  const register = async (payload: { fullName: string; email: string; password: string; department?: string }) => {
    const data = await authApi.register(payload);
    setAccessToken(data.accessToken);
    setUser(data.user);
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  };

  const updateUser = (updated: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...updated });
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
