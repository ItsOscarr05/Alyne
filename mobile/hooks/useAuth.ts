import { useState, useEffect } from 'react';
import { storage } from '../utils/storage';
import { authService, AuthResponse } from '../services/auth';
import { User } from '../types';
import { logger } from '../utils/logger';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AUTH_TOKEN_KEY = 'auth_token';
const USER_KEY = 'user_data';

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: null,
    isLoading: true,
    isAuthenticated: false,
  });

  // Load auth state on mount
  useEffect(() => {
    loadAuthState();
  }, []);

  const loadAuthState = async () => {
    try {
      const [token, userJson] = await Promise.all([
        storage.getItem(AUTH_TOKEN_KEY),
        storage.getItem(USER_KEY),
      ]);

      if (token && userJson) {
        const user = JSON.parse(userJson);
        setAuthState({
          user,
          token,
          isLoading: false,
          isAuthenticated: true,
        });
      } else {
        setAuthState({
          user: null,
          token: null,
          isLoading: false,
          isAuthenticated: false,
        });
      }
    } catch (error) {
      logger.error('Error loading auth state', error);
      setAuthState({
        user: null,
        token: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  };

  const login = async (email: string, password: string): Promise<AuthResponse> => {
    const response = await authService.login({ email, password });
    
    await Promise.all([
      storage.setItem(AUTH_TOKEN_KEY, response.token),
      storage.setItem(USER_KEY, JSON.stringify(response.user)),
    ]);

    setAuthState({
      user: response.user,
      token: response.token,
      isLoading: false,
      isAuthenticated: true,
    });

    return response;
  };

  const register = async (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    userType: 'provider' | 'client',
    phoneNumber?: string
  ): Promise<AuthResponse> => {
    const response = await authService.register({
      email,
      password,
      firstName,
      lastName,
      userType: userType.toUpperCase() as 'PROVIDER' | 'CLIENT',
      phoneNumber,
    });

    await Promise.all([
      storage.setItem(AUTH_TOKEN_KEY, response.token),
      storage.setItem(USER_KEY, JSON.stringify(response.user)),
    ]);

    setAuthState({
      user: response.user,
      token: response.token,
      isLoading: false,
      isAuthenticated: true,
    });

    return response;
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      logger.error('Error during logout', error);
    } finally {
      await Promise.all([
        storage.removeItem(AUTH_TOKEN_KEY),
        storage.removeItem(USER_KEY),
      ]);

      setAuthState({
        user: null,
        token: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  };

  const refreshUser = async () => {
    try {
      const userJson = await storage.getItem(USER_KEY);
      if (userJson) {
        const user = JSON.parse(userJson);
        setAuthState((prev) => ({
          ...prev,
          user,
        }));
      }
    } catch (error) {
      logger.error('Error refreshing user', error);
    }
  };

  const deleteAccount = async () => {
    try {
      await authService.deleteAccount();
    } catch (error) {
      logger.error('Error during account deletion', error);
      throw error;
    } finally {
      await Promise.all([
        storage.removeItem(AUTH_TOKEN_KEY),
        storage.removeItem(USER_KEY),
      ]);

      setAuthState({
        user: null,
        token: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  };

  return {
    ...authState,
    login,
    register,
    logout,
    refreshUser,
    deleteAccount,
  };
};

