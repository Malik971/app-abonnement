/**
 * Authentification & rôles.
 *
 * Deux types de comptes dans la même app :
 *   - client  : connexion par téléphone (OTP SMS), fallback email magic link.
 *   - merchant: connexion par email + mot de passe.
 *
 * Le rôle est stocké dans user_metadata ET dans la table `profiles`.
 * Il est figé après inscription (changement = opération manuelle).
 */
import { useEffect } from 'react';

import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { UserRole } from '@/types';

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

    async function bootstrap() {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      const role = session?.user ? await loadRoleForUser(session.user.id) : null;
      if (active) {
        setAuth({ session, role });
        setInitializing(false);
      }
    }
    void bootstrap();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const role = session?.user ? await loadRoleForUser(session.user.id) : null;
      if (active) setAuth({ session, role });
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
// Actions — Client (OTP téléphone, fallback email magic link)
// ─────────────────────────────────────────────────────────────────────────────

/** Envoie un code OTP par SMS. */
export async function startPhoneSignIn(phone: string): Promise<{ error?: string }> {
  const { error } = await supabase.auth.signInWithOtp({ phone: phone.trim() });
  return error ? { error: error.message } : {};
}

/**
 * Vérifie le code OTP SMS et provisionne le profil client.
 * `firstName` est optionnel : fourni à l'inscription, omis à la connexion d'un
 * compte existant (on n'écrase pas le prénom déjà enregistré).
 */
export async function verifyPhoneSignIn(
  phone: string,
  token: string,
  firstName = '',
): Promise<{ error?: string }> {
  const { data, error } = await supabase.auth.verifyOtp({
    phone: phone.trim(),
    token: token.trim(),
    type: 'sms',
  });
  if (error) return { error: error.message };

  const userId = data.user?.id;
  if (userId) {
    const name = firstName.trim();
    if (name) {
      await supabase.auth.updateUser({ data: { role: 'client', first_name: name } });
    }
    await ensureProfile(userId, 'client');
    await ensureClientRow(userId, name, phone.trim());
  }
  return {};
}

/** Fallback : envoie un magic link par email si le SMS n'est pas configuré. */
export async function startEmailMagicLink(email: string): Promise<{ error?: string }> {
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: { data: { role: 'client' } },
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
