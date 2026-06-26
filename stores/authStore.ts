/**
 * Store d'authentification (Zustand).
 * Garde la session Supabase, l'utilisateur et son rôle en mémoire.
 * Les flux (login / register / signOut) vivent dans hooks/useAuth.ts.
 */
import type { Session, User } from '@supabase/supabase-js';
import { create } from 'zustand';

import type { UserRole } from '@/types';

interface AuthState {
  session: Session | null;
  user: User | null;
  role: UserRole | null;
  /** True tant que la session initiale n'a pas été résolue (splash). */
  initializing: boolean;
  /** True une fois le consentement RGPD donné (persisté à part). */
  hasConsent: boolean;

  setAuth: (payload: { session: Session | null; role: UserRole | null }) => void;
  setRole: (role: UserRole | null) => void;
  setInitializing: (value: boolean) => void;
  setConsent: (value: boolean) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  role: null,
  initializing: true,
  hasConsent: false,

  setAuth: ({ session, role }) =>
    set({ session, user: session?.user ?? null, role }),

  setRole: (role) => set({ role }),

  setInitializing: (value) => set({ initializing: value }),

  setConsent: (value) => set({ hasConsent: value }),

  clear: () => set({ session: null, user: null, role: null }),
}));
