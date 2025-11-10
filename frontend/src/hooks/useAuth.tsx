import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi } from '../api/auth';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          // Verify token and fetch user data
          const userData = await authApi.me();
          setUser(userData);
        } catch (error) {
          // Token is invalid, clear it
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await authApi.login({ email, password });
    setUser(response.user);
    localStorage.setItem('token', response.token);
    localStorage.setItem('refreshToken', response.refreshToken);
  };

  const register = async (username: string, email: string, password: string) => {
    const response = await authApi.register({ username, email, password });
    setUser(response.user);
    localStorage.setItem('token', response.token);
    localStorage.setItem('refreshToken', response.refreshToken);
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      // Ignore logout errors
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
