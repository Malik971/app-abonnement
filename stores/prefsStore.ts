/**
 * Préférences locales du client (persistées sur l'appareil).
 * Pour l'instant : activation des animations et retours haptiques.
 * Activé par défaut ; si désactivé, aucun son, aucune vibration, aucune animation.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

const ANIMATIONS_KEY = 'fideli_animations_enabled';

interface PrefsState {
  hydrated: boolean;
  animationsEnabled: boolean;
  hydrate: () => Promise<void>;
  setAnimationsEnabled: (value: boolean) => Promise<void>;
}

export const usePrefsStore = create<PrefsState>((set) => ({
  hydrated: false,
  animationsEnabled: true,

  hydrate: async () => {
    try {
      const value = await AsyncStorage.getItem(ANIMATIONS_KEY);
      // Absent = jamais réglé = activé par défaut.
      set({ animationsEnabled: value === null ? true : value === 'true', hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },

  setAnimationsEnabled: async (value) => {
    set({ animationsEnabled: value });
    try {
      await AsyncStorage.setItem(ANIMATIONS_KEY, value ? 'true' : 'false');
    } catch {
      /* non bloquant */
    }
  },
}));
