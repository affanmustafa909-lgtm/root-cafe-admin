import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { api, dataOf, getToken, setToken } from '@/shared/api/client';
import type { User } from '@/shared/types';

type AuthValue = {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [tokenState, setTokenState] = useState(getToken());
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(!!tokenState);

  useEffect(() => {
    const clear = () => {
      setToken(null);
      setTokenState(null);
      setUser(null);
      setLoading(false);
    };
    window.addEventListener('auth:unauthorized', clear);
    if (!tokenState) {
      return () => window.removeEventListener('auth:unauthorized', clear);
    }
    let cancelled = false;
    api
      .get('/auth/me')
      .then((r) => {
        if (!cancelled) setUser(dataOf<User>(r));
      })
      .catch(clear)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      window.removeEventListener('auth:unauthorized', clear);
    };
  }, [tokenState]);

  const login = async (email: string, password: string) => {
    const payload = dataOf<{
      accessToken?: string;
      token?: string;
      user?: User;
    }>(await api.post('/auth/login', { email, password }));
    const token = payload.accessToken || payload.token;
    if (!token) throw new Error('No access token returned');
    setToken(token);
    setTokenState(token);
    setUser(payload.user || dataOf<User>(await api.get('/auth/me')));
    setLoading(false);
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      setToken(null);
      setTokenState(null);
      setUser(null);
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, token: tokenState, loading, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('Missing AuthProvider');
  return value;
}
