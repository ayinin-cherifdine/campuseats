import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '@/lib/api';

// Représente les champs de profil renvoyés par le backend Django
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
  /**
   * Vrai quand l'utilisateur est connecté — utilisé comme indicateur de session
   * dans les garde-fous de navigation (voir app/index.tsx).
   */
  session: AppUser | null;
  user: AppUser | null;
  /** Alias de user — les champs profil sont embarqués dans l'objet utilisateur. */
  profile: AppUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
};

// Contexte React qui rend les infos utilisateur accessibles depuis n'importe quel composant
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Restaure la session au démarrage de l'app en lisant les tokens stockés
  useEffect(() => {
    (async () => {
      try {
        const tokens = await api._tokens.get();
        if (tokens) {
          // Si des tokens sont présents, on récupère le profil utilisateur
          const me = await api.auth.me();
          setUser(me);
        }
      } catch {
        // Tokens expirés ou invalides — on réinitialise
        await api._tokens.set(null);
      } finally {
        setLoading(false);  // Fin du chargement initial
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
    setUser(null);  // Vide l'état — la navigation redirige vers /auth/login
  };

  return (
    // session et profile sont des alias de user pour la compatibilité avec les composants existants
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
