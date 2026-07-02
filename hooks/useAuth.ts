/**
 * Authentification & rôles.
 *
 * Deux types de comptes dans la même app :
 *   - client  : connexion par email + mot de passe (prénom à l'inscription).
 *   - merchant: connexion par email + mot de passe.
 *
 * Choix email+mot de passe (et non OTP SMS/email) : aucune dépendance à un envoi
 * d'email/SMS côté Supabase, donc rien à configurer (SMTP, fournisseur SMS) pour
 * que l'inscription/connexion fonctionnent en démo. Pré-requis Supabase :
 * Authentication → Providers → Email activé, et « Confirm email » DÉSACTIVÉ
 * (sinon `signUp` ne renvoie pas de session et l'utilisateur reste bloqué).
 *
 * Le rôle est stocké dans user_metadata ET dans la table `profiles`.
 * Il est figé après inscription (changement = opération manuelle).
 */
import type { Session } from '@supabase/supabase-js';
import { useEffect } from 'react';

import { withTimeout } from '@/lib/async';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { UserRole } from '@/types';

// Au-delà de ce délai au démarrage, on cesse d'attendre Supabase et on laisse
// l'app continuer (écran consentement / connexion) plutôt que de figer le splash.
const STARTUP_TIMEOUT_MS = 8000;

// ─────────────────────────────────────────────────────────────────────────────
// Chargement du rôle
// ─────────────────────────────────────────────────────────────────────────────

export async function loadRoleForUser(userId: string): Promise<UserRole | null> {
  const { data } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle();

  if (data?.role) return data.role;

  // Fallback : métadonnées de l'utilisateur (au cas où le profil n'existe pas encore).
  const { data: userData } = await supabase.auth.getUser();
  const metaRole = userData.user?.user_metadata?.role;
  return metaRole === 'client' || metaRole === 'merchant' ? metaRole : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Listener de session (à monter dans le root layout)
// ─────────────────────────────────────────────────────────────────────────────

export function useAuthListener(): void {
  const setAuth = useAuthStore((s) => s.setAuth);
  const setInitializing = useAuthStore((s) => s.setInitializing);

  useEffect(() => {
    let active = true;

    async function resolveRole(session: Session | null): Promise<UserRole | null> {
      if (!session?.user) return null;
      return withTimeout(loadRoleForUser(session.user.id), STARTUP_TIMEOUT_MS, null);
    }

    // Filet de sécurité : on débloque le splash au bout de STARTUP_TIMEOUT_MS
    // même si getSession traîne (ex : rafraîchissement de token lent). On NE met
    // PAS la session à null ici : sinon un simple refresh lent déconnecterait
    // l'utilisateur alors que sa session est bien persistée dans AsyncStorage.
    const splashTimer = setTimeout(() => {
      if (active) setInitializing(false);
    }, STARTUP_TIMEOUT_MS);

    async function bootstrap() {
      try {
        // Restaure la session persistée (rafraîchit le token si besoin via le
        // refresh token stocké). On n'écrit la session que si elle existe, pour
        // ne jamais écraser une session valide en cas de lenteur.
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          const role = await resolveRole(data.session);
          if (active) setAuth({ session: data.session, role });
        }
      } catch (e) {
        if (__DEV__) console.warn('[auth] bootstrap échoué, on continue :', e);
      } finally {
        // Absence de session gérée par onAuthStateChange (INITIAL_SESSION).
        if (active) setInitializing(false);
      }
    }
    void bootstrap();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        const role = await resolveRole(session);
        if (active) setAuth({ session, role });
      } catch (e) {
        if (__DEV__) console.warn('[auth] onAuthStateChange échoué :', e);
      } finally {
        if (active) setInitializing(false);
      }
    });

    return () => {
      active = false;
      clearTimeout(splashTimer);
      sub.subscription.unsubscribe();
    };
  }, [setAuth, setInitializing]);
}

// ─────────────────────────────────────────────────────────────────────────────
// Provisionnement des profils
// ─────────────────────────────────────────────────────────────────────────────

async function ensureProfile(userId: string, role: UserRole): Promise<void> {
  await supabase.from('profiles').upsert(
    { user_id: userId, role },
    { onConflict: 'user_id', ignoreDuplicates: true },
  );
}

async function ensureClientRow(
  userId: string,
  firstName: string,
  phone: string | null,
): Promise<void> {
  const { data: existing } = await supabase
    .from('clients')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();
  if (existing) return;
  await supabase.from('clients').insert({ user_id: userId, first_name: firstName, phone });
}

async function ensureMerchantRow(
  userId: string,
  fields: { businessName: string; businessType: string | null },
): Promise<void> {
  const { data: existing } = await supabase
    .from('merchants')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();
  if (existing) return;

  const { data: merchant } = await supabase
    .from('merchants')
    .insert({
      user_id: userId,
      business_name: fields.businessName,
      business_type: fields.businessType,
    })
    .select('id')
    .single();

  // Crée le programme de fidélité par défaut (1 point / passage, aucune récompense).
  if (merchant) {
    await supabase.from('loyalty_programs').insert({ merchant_id: merchant.id });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Actions :Commerçant (email + mot de passe)
// ─────────────────────────────────────────────────────────────────────────────

export interface MerchantSignUp {
  email: string;
  password: string;
  businessName: string;
  businessType?: string;
}

export async function signUpMerchant(input: MerchantSignUp): Promise<{ error?: string }> {
  const { data, error } = await supabase.auth.signUp({
    email: input.email.trim(),
    password: input.password,
    options: { data: { role: 'merchant' } },
  });
  if (error) return { error: error.message };

  const userId = data.user?.id;
  if (userId) {
    await ensureProfile(userId, 'merchant');
    await ensureMerchantRow(userId, {
      businessName: input.businessName.trim(),
      businessType: input.businessType?.trim() || null,
    });
  }
  return {};
}

export async function signInMerchant(email: string, password: string): Promise<{ error?: string }> {
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  return error ? { error: error.message } : {};
}

// ─────────────────────────────────────────────────────────────────────────────
// Actions :Client (email + mot de passe, ou connexion sociale)
// ─────────────────────────────────────────────────────────────────────────────
//
// PRÉ-REQUIS Supabase : Authentication > Providers > Email activé, et
// « Confirm email » DÉSACTIVÉ (sinon signUp ne renvoie pas de session).
// Longueur minimale du mot de passe imposée côté UI (8 caractères).

/** Longueur minimale du mot de passe (client et commerçant). */
export const PASSWORD_MIN = 8;

/** Provisionne le profil + la ligne client si absents (idempotent). */
export async function provisionClientAccount(userId: string): Promise<void> {
  await ensureProfile(userId, 'client');
  await ensureClientRow(userId, '', null);
}

/** Inscription client par email + mot de passe. */
export async function signUpClient(email: string, password: string): Promise<{ error?: string }> {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: { data: { role: 'client' } },
  });
  if (error) return { error: error.message };
  if (data.user?.id) await provisionClientAccount(data.user.id);
  return {};
}

/** Connexion client par email + mot de passe. */
export async function signInClient(email: string, password: string): Promise<{ error?: string }> {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  return error ? { error: error.message } : {};
}

// ─────────────────────────────────────────────────────────────────────────────
// Déconnexion
// ─────────────────────────────────────────────────────────────────────────────

export async function signOutUser(): Promise<void> {
  await supabase.auth.signOut();
  useAuthStore.getState().clear();
}
