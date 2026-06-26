/**
 * Persistance du consentement RGPD (premier lancement).
 * Stocké localement : tant qu'il n'est pas accordé, l'app n'est pas utilisable.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const CONSENT_KEY = 'gdpr.consent.v1';

export async function loadConsent(): Promise<boolean> {
  const value = await AsyncStorage.getItem(CONSENT_KEY);
  return value === 'granted';
}

export async function saveConsent(granted: boolean): Promise<void> {
  await AsyncStorage.setItem(CONSENT_KEY, granted ? 'granted' : 'refused');
}
