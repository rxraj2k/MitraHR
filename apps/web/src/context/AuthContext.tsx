import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { fetchMe, sendHeartbeat, serverLogout } from '../lib/api';

// How often an open session pings the API to say "still here" -- this is
// what the Admin Center's Live User Activity panel actually reads to tell
// Active from Away (see AdminService.getLiveActivity's awayThresholdMin,
// which an admin sets under Security & Authentication). 60s keeps a
// session reading as Active in any reasonable idle-threshold setting
// without hammering the API.
const HEARTBEAT_INTERVAL_MS = 60_000;

export type SessionKind = 'STAFF' | 'EMPLOYEE';
export type PresenceStatus = 'AVAILABLE' | 'AWAY';

export interface NotificationPreferences {
  emailOnLeaveDecision: boolean;
  emailOnAnnouncement: boolean;
  emailOnAssessmentResult: boolean;
  emailOnBirthday: boolean;
  emailOnAppraisal: boolean;
}

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
  // The linked Employee's photo, when there is one -- null for a STAFF
  // session with no linked Employee record.
  photoUrl?: string | null;
  presenceStatus: PresenceStatus;
  // null when this session has no personal Employee record to hold these
  // against (a pure admin login not linked to an Employee) -- Account
  // Settings shows an honest "not applicable" state in that case instead
  // of toggles that would silently do nothing.
  notificationPreferences: NotificationPreferences | null;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  isStaff: boolean;
  setToken: (token: string | null) => void;
  logout: () => void;
  // Merges a partial patch into the current user without a full refetch --
  // used right after a presence/notification-preference update, whose
  // response already carries the new values.
  patchUser: (patch: Partial<AuthUser>) => void;
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

  // Fire off a real server-side logout (closes the UserSession row so Live
  // User Activity shows "Logged out" rather than a stale Active/Away) but
  // never wait on it -- clearing the local token is what actually signs
  // this browser out, and must happen even if that call fails or is slow.
  const logout = () => {
    if (token) serverLogout(token);
    setToken(null);
  };

  const patchUser = (patch: Partial<AuthUser>) => {
    setUser((u) => (u ? { ...u, ...patch } : u));
  };

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

  // Heartbeat while a session is open -- see HEARTBEAT_INTERVAL_MS above.
  // Deliberately simple (no visibility/focus gating): a background tab
  // still counts as "Active" here, the same trade-off the existing manual
  // Available/Away presence toggle already makes.
  const heartbeatToken = useRef(token);
  heartbeatToken.current = token;
  useEffect(() => {
    if (!token) return;
    const interval = setInterval(() => {
      if (heartbeatToken.current) sendHeartbeat(heartbeatToken.current);
    }, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [token]);

  // If an admin force-ends this session (Admin Center > Live User
  // Activity) or the token simply expires, the next API call gets a 401
  // and api.ts fires this event -- sign out locally right away rather than
  // leaving a dead token active until something else happens to fail.
  useEffect(() => {
    function onUnauthorized() {
      setToken(null);
    }
    window.addEventListener('mitrahr:unauthorized', onUnauthorized);
    return () => window.removeEventListener('mitrahr:unauthorized', onUnauthorized);
  }, []);

  const isStaff = user?.kind === 'STAFF';

  return (
    <AuthContext.Provider value={{ user, token, loading, isStaff, setToken, logout, patchUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
