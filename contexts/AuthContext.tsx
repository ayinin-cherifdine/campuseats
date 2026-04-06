import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '@/lib/api';

// Matches the profile fields returned by the Django backend
export type AppUser = {
  id: string;
  email: string;
  username: string;
  full_name: string;
  avatar_url: string;
  bio: string;
  campus_location: string;
  followers_count: number;
  following_count: number;
  created_at: string;
};

type AuthContextType = {
  /** Truthy when logged in — used as a session indicator in navigation guards. */
  session: AppUser | null;
  user: AppUser | null;
  /** Same as user — profile fields are embedded in the user object. */
  profile: AppUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    (async () => {
      try {
        const tokens = await api._tokens.get();
        if (tokens) {
          const me = await api.auth.me();
          setUser(me);
        }
      } catch {
        await api._tokens.set(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const signIn = async (email: string, password: string) => {
    const me = await api.auth.signIn(email, password);
    setUser(me);
  };

  const signUp = async (
    email: string,
    password: string,
    username: string,
    fullName: string
  ) => {
    const me = await api.auth.signUp(email, password, username, fullName);
    setUser(me);
  };

  const signOut = async () => {
    await api.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ session: user, user, profile: user, loading, signIn, signUp, signOut }}
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
