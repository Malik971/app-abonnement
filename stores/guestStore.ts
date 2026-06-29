/**
 * État « invité » (Zustand) : mode sans compte + onboarding vu.
 *
 * Philosophie : l'app est une expérience CLIENT par défaut. On n'écrit JAMAIS
 * en base en mode invité. Le compte n'est demandé qu'au moment d'une vraie
 * action (enregistrer une carte, rejoindre un commerce, réclamer une récompense)
 * via la bottom-sheet `AuthSheet`, ouverte par `requireAuth()`.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

const ONBOARDING_KEY = 'fideli_onboarding_seen';
const GUEST_KEY = 'fideli_guest_mode';

interface GuestState {
  /** True une fois l'état chargé depuis AsyncStorage (évite les redirections prématurées). */
  hydrated: boolean;
  /** L'onboarding a déjà été vu au moins une fois. */
  onboardingSeen: boolean;
  /** L'utilisateur explore sans compte. */
  isGuest: boolean;

  // Mur de création de compte (bottom-sheet)
  authSheetVisible: boolean;
  /** Raison contextuelle affichée dans la sheet (ex : « enregistrer cette carte »). */
  authReason: string | null;

  hydrate: () => Promise<void>;
  markOnboardingSeen: () => Promise<void>;
  enterGuest: () => Promise<void>;
  /** Quitte le mode invité (appelé après une connexion réussie). */
  leaveGuest: () => Promise<void>;
  /** Ouvre le mur de compte. `reason` = action que l'invité tentait. */
  requireAuth: (reason?: string) => void;
  closeAuthSheet: () => void;
}

export const useGuestStore = create<GuestState>((set) => ({
  hydrated: false,
  onboardingSeen: false,
  isGuest: false,
  authSheetVisible: false,
  authReason: null,

  hydrate: async () => {
    try {
      const [seen, guest] = await AsyncStorage.multiGet([ONBOARDING_KEY, GUEST_KEY]);
      set({
        onboardingSeen: seen?.[1] === 'true',
        isGuest: guest?.[1] === 'true',
        hydrated: true,
      });
    } catch {
      set({ hydrated: true });
    }
  },

  markOnboardingSeen: async () => {
    set({ onboardingSeen: true });
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    } catch {
      /* non bloquant */
    }
  },

  enterGuest: async () => {
    set({ isGuest: true });
    try {
      await AsyncStorage.setItem(GUEST_KEY, 'true');
    } catch {
      /* non bloquant */
    }
  },

  leaveGuest: async () => {
    set({ isGuest: false, authSheetVisible: false, authReason: null });
    try {
      await AsyncStorage.removeItem(GUEST_KEY);
    } catch {
      /* non bloquant */
    }
  },

  requireAuth: (reason) => set({ authSheetVisible: true, authReason: reason ?? null }),

  closeAuthSheet: () => set({ authSheetVisible: false, authReason: null }),
}));
