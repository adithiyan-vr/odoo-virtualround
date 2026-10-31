'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authApi, type User } from '@/lib/api-client';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  isCustomer: boolean;
  login: (email: string, pass: string) => Promise<User>;
  signup: (name: string, email: string, pass: string) => Promise<User>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const refresh = useCallback(async () => {
    try {
      const me = await authApi.getMe();
      setUser(me);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = async (email: string, pass: string) => {
    const loggedInUser = await authApi.login(email, pass);
    setUser(loggedInUser);
    return loggedInUser;
  };

  const signup = async (name: string, email: string, pass: string) => {
    const newUser = await authApi.signup(name, email, pass);
    setUser(newUser);
    return newUser;
  };

  const logout = async () => {
    await authApi.logout();
    setUser(null);
    router.push('/login');
  };

  const isAdmin = user?.role === 'ADMIN';
  const isStaff = user?.role === 'STAFF' || user?.role === 'ADMIN';
  const isCustomer = user?.role === 'CUSTOMER';

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAdmin,
        isStaff,
        isCustomer,
        login,
        signup,
        logout,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

