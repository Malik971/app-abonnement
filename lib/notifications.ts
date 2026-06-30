/**
 * Helpers Expo Notifications.
 *
 * - Demande la permission + récupère le push token Expo.
 * - Enregistre le token sur la ligne merchant/client correspondante.
 * - L'envoi réel des notifications se fait côté serveur (edge function), jamais
 *   depuis le client : un commerçant ne doit pas pouvoir spammer l'API Expo.
 */
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

// Affiche les notifications même app au premier plan.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    // shouldShowAlert est déprécié mais encore requis par le type ;
    // shouldShowBanner/List sont les remplaçants SDK 54.
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Demande la permission et renvoie le token push Expo (ou null si refus /
 * simulateur). À appeler après le consentement RGPD.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    // Les push ne fonctionnent pas sur simulateur/émulateur.
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Notifications',
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: '#D62828',
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;
  if (existing !== 'granted') {
    const req = await Notifications.requestPermissionsAsync();
    status = req.status;
  }
  if (status !== 'granted') return null;

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  try {
    const token = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    return token.data;
  } catch (e) {
    console.warn('[notifications] impossible de récupérer le token', e);
    return null;
  }
}

/** Enregistre le push token sur la ligne client. */
export async function saveClientPushToken(clientId: string, token: string): Promise<void> {
  await supabase.from('clients').update({ push_token: token }).eq('id', clientId);
}

/** Enregistre le push token sur la ligne commerçant. */
export async function saveMerchantPushToken(merchantId: string, token: string): Promise<void> {
  await supabase.from('merchants').update({ push_token: token }).eq('id', merchantId);
}
