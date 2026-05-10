import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import { apiClient, HttpError } from '../services/api';
import { College, User } from '../types';

type SessionType = 'guest' | 'user' | 'college';

interface SessionState {
  type: SessionType;
  token: string | null;
  user: User | null;
  college: College | null;
}

interface AuthContextType {
  loading: boolean;
  isAuthenticated: boolean;
  sessionType: SessionType;
  user: User | null;
  college: College | null;
  token: string | null;
  loginUser: (email: string, password: string) => Promise<User | null>;
  loginCollege: (loginCode: string, password: string) => Promise<College | null>;
  completeSignup: (payload: { session_id: string; email_otp: string; whatsapp_otp: string }) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateMode: (mode: 'borrower' | 'lender') => Promise<void>;
  withAuth: <T>(request: (token: string) => Promise<T>) => Promise<T>;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  setCollege: React.Dispatch<React.SetStateAction<College | null>>;
}

const SESSION_KEY = 'ira_session_v2';

const defaultSession: SessionState = {
  type: 'guest',
  token: null,
  user: null,
  college: null,
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function persistSession(session: SessionState) {
  if (session.type === 'guest') {
    localStorage.removeItem(SESSION_KEY);
    return;
  }

  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<SessionState>(defaultSession);
  const sessionRef = useRef(session);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) {
      setLoading(false);
      return;
    }

    try {
      const parsed = JSON.parse(raw) as SessionState;
      setSession(parsed);
    } catch {
      localStorage.removeItem(SESSION_KEY);
    } finally {
      setLoading(false);
    }
  }, []);

  const commitSession = (next: SessionState) => {
    persistSession(next);
    setSession(next);
  };

  const withAuth = async <T,>(request: (token: string) => Promise<T>) => {
    const activeSession = sessionRef.current;
    if (!activeSession.token) {
      throw new HttpError('Authentication required', 401);
    }

    if (activeSession.type === 'college') {
      return request(activeSession.token);
    }

    try {
      return await request(activeSession.token);
    } catch (error) {
      if (!(error instanceof HttpError) || error.status !== 401) {
        throw error;
      }

      const refreshed = await apiClient.refresh();
      if (!refreshed.user) {
        throw error;
      }

      const nextSession: SessionState = {
        type: 'user',
        token: refreshed.accessToken,
        user: refreshed.user,
        college: sessionRef.current.college,
      };
      commitSession(nextSession);
      return request(nextSession.token || '');
    }
  };

  const loginUser = async (email: string, password: string) => {
    const payload = await apiClient.login(email, password);
    const nextSession: SessionState = {
      type: 'user',
      token: payload.accessToken,
      user: payload.user || null,
      college: null,
    };
    commitSession(nextSession);
    return payload.user || null;
  };

  const loginCollege = async (loginCode: string, password: string) => {
    const payload = await apiClient.collegeLogin(loginCode, password);
    const nextSession: SessionState = {
      type: 'college',
      token: payload.accessToken,
      user: null,
      college: payload.college || null,
    };
    commitSession(nextSession);
    return payload.college || null;
  };

  const completeSignup = async (payload: {
    session_id: string;
    email_otp: string;
    whatsapp_otp: string;
  }) => {
    const response = await apiClient.verifySignup(payload);
    const nextSession: SessionState = {
      type: 'user',
      token: response.accessToken,
      user: response.user || null,
      college: null,
    };
    commitSession(nextSession);
    return response.user as User;
  };

  const refreshUser = async () => {
    if (sessionRef.current.type !== 'user' || !sessionRef.current.token) {
      return;
    }

    const payload = await withAuth((token) => apiClient.getMe(token));
    commitSession({
      type: 'user',
      token: sessionRef.current.token,
      user: payload.user,
      college: payload.college,
    });
  };

  const updateMode = async (mode: 'borrower' | 'lender') => {
    await withAuth((token) => apiClient.updateMode(token, mode));
    await refreshUser();
  };

  const logout = async () => {
    try {
      if (sessionRef.current.type === 'user') {
        await apiClient.logout();
      }
    } catch {
      // Ignore logout failures and clear local session regardless.
    } finally {
      commitSession(defaultSession);
    }
  };

  const value: AuthContextType = {
    loading,
    isAuthenticated: session.type !== 'guest',
    sessionType: session.type,
    user: session.user,
    college: session.college,
    token: session.token,
    loginUser,
    loginCollege,
    completeSignup,
    logout,
    refreshUser,
    updateMode,
    withAuth,
    setUser: (updater) => {
      setSession((current) => {
        const nextUser =
          typeof updater === 'function'
            ? (updater as (value: User | null) => User | null)(current.user)
            : updater;
        const nextSession = { ...current, user: nextUser };
        persistSession(nextSession);
        return nextSession;
      });
    },
    setCollege: (updater) => {
      setSession((current) => {
        const nextCollege =
          typeof updater === 'function'
            ? (updater as (value: College | null) => College | null)(current.college)
            : updater;
        const nextSession = { ...current, college: nextCollege };
        persistSession(nextSession);
        return nextSession;
      });
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
