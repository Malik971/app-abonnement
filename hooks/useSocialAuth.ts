/**
 * Connexion sociale client (Apple, Google, Facebook) via Supabase
 * signInWithIdToken. Un nouveau compte social se voit attribuer le rôle client.
 *
 * IMPORTANT : ces fournisseurs reposent sur des modules natifs qui NE
 * fonctionnent PAS dans Expo Go. Il faut un build de développement (EAS) et la
 * configuration des identifiants côté Apple / Google / Facebook + Supabase.
 * Les imports sont dynamiques et protégés : dans Expo Go, le bouton renvoie une
 * erreur claire au lieu de faire planter l'app.
 */
import { Platform } from 'react-native';

import { provisionClientAccount } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

export interface SocialResult {
  /** True si une session a bien été établie. */
  ok: boolean;
  /** Message d'erreur à afficher (absent si l'utilisateur a simplement annulé). */
  error?: string;
}

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

/** Finalise la connexion : établit la session Supabase + provisionne le client. */
async function completeWithIdToken(
  provider: 'apple' | 'google' | 'facebook',
  token: string,
  nonce?: string,
): Promise<SocialResult> {
  const { data, error } = await supabase.auth.signInWithIdToken({ provider, token, nonce });
  if (error) return { ok: false, error: error.message };
  if (data.user?.id) await provisionClientAccount(data.user.id);
  return { ok: true };
}

// ── Apple ─────────────────────────────────────────────────────────────────────

export async function signInWithApple(): Promise<SocialResult> {
  try {
    const Apple = await import('expo-apple-authentication');
    const credential = await Apple.signInAsync({
      requestedScopes: [
        Apple.AppleAuthenticationScope.FULL_NAME,
        Apple.AppleAuthenticationScope.EMAIL,
      ],
    });
    if (!credential.identityToken) return { ok: false, error: 'Connexion Apple impossible.' };
    return completeWithIdToken('apple', credential.identityToken);
  } catch (e) {
    // Annulation par l'utilisateur : pas d'erreur affichée.
    if (e && typeof e === 'object' && 'code' in e && e.code === 'ERR_REQUEST_CANCELED') {
      return { ok: false };
    }
    return { ok: false, error: "Connexion Apple indisponible (build requis)." };
  }
}

// ── Google ────────────────────────────────────────────────────────────────────

export async function signInWithGoogle(): Promise<SocialResult> {
  if (!GOOGLE_WEB_CLIENT_ID) {
    return { ok: false, error: 'Google non configuré (identifiants manquants).' };
  }
  try {
    const mod = await import('@react-native-google-signin/google-signin');
    const { GoogleSignin } = mod;
    GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
      iosClientId: GOOGLE_IOS_CLIENT_ID,
    });
    await GoogleSignin.hasPlayServices();
    const result = await GoogleSignin.signIn();
    // v13+ renvoie { type, data: { idToken } } ; on gère aussi l'ancien format.
    const idToken =
      (result as { data?: { idToken?: string } }).data?.idToken ??
      (result as { idToken?: string }).idToken;
    if (!idToken) return { ok: false };
    return completeWithIdToken('google', idToken);
  } catch {
    return { ok: false, error: 'Connexion Google indisponible (build requis).' };
  }
}

// ── Facebook (Limited Login / OIDC) ─────────────────────────────────────────────

export async function signInWithFacebook(): Promise<SocialResult> {
  try {
    const mod = await import('react-native-fbsdk-next');
    const { LoginManager, AuthenticationToken } = mod;
    const nonce = Math.random().toString(36).slice(2);
    const result = await LoginManager.logInWithPermissions(['public_profile', 'email'], 'limited', nonce);
    if (result.isCancelled) return { ok: false };

    // Le token OIDC (Limited Login) est récupérable sur iOS.
    if (Platform.OS === 'ios') {
      const tokenData = await AuthenticationToken.getAuthenticationTokenIOS();
      const token = tokenData?.authenticationToken;
      if (!token) return { ok: false, error: 'Connexion Facebook impossible.' };
      return completeWithIdToken('facebook', token, nonce);
    }
    return { ok: false, error: 'Connexion Facebook disponible sur iOS pour le moment.' };
  } catch {
    return { ok: false, error: 'Connexion Facebook indisponible (build requis).' };
  }
}
