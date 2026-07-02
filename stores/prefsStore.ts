/**
 * Préférences locales (persistées sur l'appareil) :
 *   - animations et retours haptiques (client), activés par défaut ;
 *   - tutoriel commerçant vu ou non (tooltips de premier lancement).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

const ANIMATIONS_KEY = 'fideli_animations_enabled';
const MERCHANT_TOUR_KEY = 'fideli_merchant_tour_done';

interface PrefsState {
  hydrated: boolean;
  animationsEnabled: boolean;
  merchantTourDone: boolean;
  hydrate: () => Promise<void>;
  setAnimationsEnabled: (value: boolean) => Promise<void>;
  markMerchantTourDone: () => Promise<void>;
  resetMerchantTour: () => Promise<void>;
}

export const usePrefsStore = create<PrefsState>((set) => ({
  hydrated: false,
  animationsEnabled: true,
  merchantTourDone: false,

  hydrate: async () => {
    try {
      const [anim, tour] = await AsyncStorage.multiGet([ANIMATIONS_KEY, MERCHANT_TOUR_KEY]);
      const animVal = anim?.[1] ?? null;
      set({
        // Absent = jamais réglé = activé par défaut.
        animationsEnabled: animVal === null ? true : animVal === 'true',
        merchantTourDone: tour?.[1] === 'true',
        hydrated: true,
      });
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

  markMerchantTourDone: async () => {
    set({ merchantTourDone: true });
    try {
      await AsyncStorage.setItem(MERCHANT_TOUR_KEY, 'true');
    } catch {
      /* non bloquant */
    }
  },

  resetMerchantTour: async () => {
    set({ merchantTourDone: false });
    try {
      await AsyncStorage.removeItem(MERCHANT_TOUR_KEY);
    } catch {
      /* non bloquant */
    }
  },
}));
