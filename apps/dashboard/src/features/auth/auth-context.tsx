import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { AuthResponse, AuthUser } from '@plastimatic/shared';
import { getToken, setToken } from '@/lib/api-client';
import { authApi } from './api/auth-api';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (response: AuthResponse) => void;
  logout: () => void;
  /** Refreshes the in-memory user (header avatar/name, etc.) after a
   *  profile/avatar update — no re-login or page reload needed. */
  updateUser: (user: AuthUser) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setIsLoading(false);
      return;
    }
    authApi
      .me()
      .then(setUser)
      .catch(() => setToken(null))
      .finally(() => setIsLoading(false));
  }, []);

  const login = (response: AuthResponse) => {
    setToken(response.accessToken);
    setUser(response.user);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    queryClient.clear();
  };

  const value = useMemo(() => ({ user, isLoading, login, logout, updateUser: setUser }), [user, isLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
