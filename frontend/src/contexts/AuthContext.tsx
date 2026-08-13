import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from '../types';
import { api, getAuthToken, setAuthToken, clearAuthToken } from '../services/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (user: User) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    const token = getAuthToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const userData = await api.get<User>('/auth/me');
      setUser(userData);
    } catch (err) {
      console.error('Failed to fetch user:', err);
      clearAuthToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = (token: string, userData: User) => {
    setAuthToken(token);
    setUser(userData);
  };

  const logout = () => {
    clearAuthToken();
    setUser(null);
  };

  const updateUser = (userData: User) => {
    setUser(userData);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser, refreshUser }}>
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
