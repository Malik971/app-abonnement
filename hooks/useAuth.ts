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

    async function bootstrap() {
      try {
        // getSession peut pendre (token à rafraîchir, URL Supabase injoignable…)
        // → on borne l'attente pour ne jamais figer l'écran de chargement.
        const session = await withTimeout(
          supabase.auth.getSession().then((r) => r.data.session),
          STARTUP_TIMEOUT_MS,
          null,
        );
        const role = await resolveRole(session);
        if (active) setAuth({ session, role });
      } catch (e) {
        if (__DEV__) console.warn('[auth] bootstrap échoué, on continue sans session :', e);
      } finally {
        // On débloque TOUJOURS le splash, quoi qu'il arrive.
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
  businessName: string,
  businessType: string | null,
): Promise<void> {
  const { data: existing } = await supabase
    .from('merchants')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();
  if (existing) return;

  const { data: merchant } = await supabase
    .from('merchants')
    .insert({ user_id: userId, business_name: businessName, business_type: businessType })
    .select('id')
    .single();

  // Crée le programme de fidélité par défaut (1 point / passage, aucune récompense).
  if (merchant) {
    await supabase.from('loyalty_programs').insert({ merchant_id: merchant.id });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Actions — Commerçant (email + mot de passe)
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
    await ensureMerchantRow(userId, input.businessName.trim(), input.businessType ?? null);
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
// Actions — Client (email + mot de passe)
// ─────────────────────────────────────────────────────────────────────────────

export interface ClientSignUp {
  email: string;
  password: string;
  firstName: string;
}

/** Inscription client : crée le compte, le profil et la ligne `clients`. */
export async function signUpClient(input: ClientSignUp): Promise<{ error?: string }> {
  const { data, error } = await supabase.auth.signUp({
    email: input.email.trim(),
    password: input.password,
    options: { data: { role: 'client', first_name: input.firstName.trim() } },
  });
  if (error) return { error: error.message };

  const userId = data.user?.id;
  if (userId) {
    await ensureProfile(userId, 'client');
    await ensureClientRow(userId, input.firstName.trim(), null);
  }
  return {};
}

/** Connexion client. */
export async function signInClient(email: string, password: string): Promise<{ error?: string }> {
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  return error ? { error: error.message } : {};
}

// ─────────────────────────────────────────────────────────────────────────────
// Déconnexion
// ─────────────────────────────────────────────────────────────────────────────

export async function signOutUser(): Promise<void> {
  await supabase.auth.signOut();
  useAuthStore.getState().clear();
}
