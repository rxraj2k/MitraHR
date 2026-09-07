import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { fetchMe } from '../lib/api';

export type SessionKind = 'STAFF' | 'EMPLOYEE';

interface AuthUser {
  id: string;
  kind: SessionKind;
  email: string;
  name: string;
  role: string;
  // The Employee record this session corresponds to: always set for an
  // EMPLOYEE (OTP) session (same as id); set for a STAFF session only when
  // that admin has been linked to their own Employee record.
  employeeId?: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  isStaff: boolean;
  setToken: (token: string | null) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(localStorage.getItem('mitrahr_token'));
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const setToken = (newToken: string | null) => {
    if (newToken) {
      localStorage.setItem('mitrahr_token', newToken);
    } else {
      localStorage.removeItem('mitrahr_token');
    }
    setTokenState(newToken);
  };

  const logout = () => setToken(null);

  useEffect(() => {
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    fetchMe(token)
      .then((data) => setUser(data))
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, [token]);

  const isStaff = user?.kind === 'STAFF';

  return (
    <AuthContext.Provider value={{ user, token, loading, isStaff, setToken, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
