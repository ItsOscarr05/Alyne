import { useState, createContext, useContext, ReactNode, useEffect } from 'react';
import { authService } from '../services/auth';
import type { User } from '../types';

const AUTH_TOKEN_KEY = 'auth_token';
const USER_KEY = 'user_data';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<{ user: User }>;
  register: (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    userType: 'provider' | 'client'
  ) => Promise<{ user: User }>;
  logout: () => Promise<void>;
  refreshUser: () => void;
  setUserFromResponse: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const userJson = localStorage.getItem(USER_KEY);
    if (token && userJson) {
      try {
        const parsed = JSON.parse(userJson);
        setUser(parsed);
      } catch {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const { user: u, token } = await authService.login({ email, password });
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(u));
    setUser(u);
    return { user: u };
  };

  const register = async (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    userType: 'provider' | 'client'
  ) => {
    const { user: u, token } = await authService.register({
      email,
      password,
      firstName,
      lastName,
      userType: userType.toUpperCase() as 'PROVIDER' | 'CLIENT',
    });
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(u));
    setUser(u);
    return { user: u };
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch {
      // ignore
    } finally {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      setUser(null);
    }
  };

  const refreshUser = () => {
    const userJson = localStorage.getItem(USER_KEY);
    if (userJson) {
      try {
        setUser(JSON.parse(userJson));
      } catch {
        // ignore
      }
    }
  };

  const setUserFromResponse = (u: User) => {
    localStorage.setItem(USER_KEY, JSON.stringify(u));
    setUser(u);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshUser,
        setUserFromResponse,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
