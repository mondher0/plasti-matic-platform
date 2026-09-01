import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { AuthResponse, AuthUser } from '@plastimatic/shared';
import { getToken, setToken, setUnauthorizedHandler } from '@/lib/api-client';
import { cartApi } from '@/features/cart/api/cart-api';
import { authApi } from './api/auth-api';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (response: AuthResponse) => Promise<void>;
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

  // If an already-open session gets blocked or the account gets deleted, the
  // very next authenticated request comes back 401/403 (checked server-side
  // on every request, not just at login) — this tears the session down
  // immediately and shows the server's message instead of leaving the user
  // stuck with a token that silently fails on everything.
  useEffect(() => {
    setUnauthorizedHandler((message) => {
      setToken(null);
      setUser(null);
      queryClient.clear();
      toast.error(message);
    });
    return () => setUnauthorizedHandler(null);
  }, [queryClient]);

  const login = async (response: AuthResponse) => {
    setToken(response.accessToken);
    setUser(response.user);
    // Fold the guest cart (if any) into the now-known user's cart.
    try {
      const mergedCart = await cartApi.merge();
      queryClient.setQueryData(['cart'], mergedCart);
    } catch {
      // Non-fatal: worst case the guest cart items are simply lost.
    }
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
