/**
 * Helpers Stripe (abonnement commerçant uniquement — aucun paiement côté client).
 *
 * Choix d'implémentation (le plus simple, documenté ici) :
 *   - On NE manipule jamais la clé secrète Stripe côté app.
 *   - L'app appelle une edge function Supabase (`stripe-checkout`) qui crée une
 *     session Stripe Checkout et renvoie son URL.
 *   - On ouvre l'URL dans le navigateur système (Linking). Au retour, le
 *     webhook Stripe (edge function `stripe-webhook`) met à jour le plan en base.
 *
 * Pour une expérience 100 % in-app, on pourrait basculer plus tard sur
 * @stripe/stripe-react-native (PaymentSheet) — la dépendance est déjà installée.
 */
import { Linking } from 'react-native';

import { PLANS, type PlanId } from '@/constants/plans';
import { supabase } from '@/lib/supabase';

export interface CheckoutResult {
  ok: boolean;
  url?: string;
  error?: string;
}

/**
 * Démarre l'abonnement (ou l'upgrade) vers un plan payant.
 * Appelle l'edge function qui crée la session Checkout côté serveur.
 */
export async function startCheckout(merchantId: string, plan: PlanId): Promise<CheckoutResult> {
  const priceId = PLANS[plan].stripe_price_id;
  if (!priceId) {
    return { ok: false, error: 'Prix Stripe non configuré pour ce plan.' };
  }

  const { data, error } = await supabase.functions.invoke<{ url: string }>(
    'stripe-checkout',
    { body: { merchantId, plan, priceId } },
  );

  if (error || !data?.url) {
    return { ok: false, error: error?.message ?? 'Création de la session impossible.' };
  }

  await Linking.openURL(data.url);
  return { ok: true, url: data.url };
}

/** Ouvre le portail de gestion d'abonnement Stripe (résiliation, facture...). */
export async function openBillingPortal(merchantId: string): Promise<CheckoutResult> {
  const { data, error } = await supabase.functions.invoke<{ url: string }>(
    'stripe-portal',
    { body: { merchantId } },
  );

  if (error || !data?.url) {
    return { ok: false, error: error?.message ?? 'Portail indisponible.' };
  }

  await Linking.openURL(data.url);
  return { ok: true, url: data.url };
}
