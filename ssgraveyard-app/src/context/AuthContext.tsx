import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  User,
  initializeAuth,
  loginUser,
  registerUser,
  logoutUser,
  updateUserProfile,
  getActiveUser,
} from '../auth';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (patch: Partial<User>) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const active = await initializeAuth();
        if (isMounted) {
          setUser(active);
        }
      } catch (err) {
        console.warn('Failed to load user state:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    const result = await loginUser(email, pass);
    if (result.success && result.user) {
      setUser(result.user);
    }
    setIsLoading(false);
    return { success: result.success, error: result.error };
  };

  const register = async (name: string, email: string, pass: string) => {
    setIsLoading(true);
    const result = await registerUser(name, email, pass);
    if (result.success && result.user) {
      setUser(result.user);
    }
    setIsLoading(false);
    return { success: result.success, error: result.error };
  };

  const logout = async () => {
    setIsLoading(true);
    await logoutUser();
    setUser(null);
    setIsLoading(false);
  };

  const updateProfile = async (patch: Partial<User>) => {
    const updated = await updateUserProfile(patch);
    if (updated) {
      setUser(updated);
    }
  };

  const refreshUser = async () => {
    const current = await getActiveUser();
    setUser(current);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        register,
        logout,
        updateProfile,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
