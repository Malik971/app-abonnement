/**
 * Définition des 3 paliers tarifaires et de la logique des « murs ».
 *
 * MUR 1 : max_clients (limite de clients actifs sur Starter)
 * MUR 2 : push_notifications (notifications verrouillées sur Starter)
 * MUR 3 : stats_detailed (stats détaillées verrouillées sur Starter)
 */

export const PLANS = {
  starter: {
    id: 'starter',
    label: 'Starter',
    price_eur: 0,
    stripe_price_id: process.env.EXPO_PUBLIC_STRIPE_PRICE_STARTER ?? '',
    max_clients: 50, // MUR 1 : bloqué à 50 clients actifs
    push_notifications: false, // MUR 2 : push verrouillé
    stats_detailed: false, // MUR 3 : stats détaillées verrouillées
    multi_site: false,
    sms: false,
    branded_app: false,
  },
  pro: {
    id: 'pro',
    label: 'Pro',
    price_eur: 29.99,
    stripe_price_id: process.env.EXPO_PUBLIC_STRIPE_PRICE_PRO ?? '',
    max_clients: null, // Illimité
    push_notifications: true,
    stats_detailed: true,
    multi_site: false,
    sms: false,
    branded_app: false,
  },
  premium: {
    id: 'premium',
    label: 'Premium',
    price_eur: 69,
    stripe_price_id: process.env.EXPO_PUBLIC_STRIPE_PRICE_PREMIUM ?? '',
    max_clients: null,
    push_notifications: true,
    stats_detailed: true,
    multi_site: true,
    sms: true,
    branded_app: true,
  },
} as const;

export type PlanId = keyof typeof PLANS;

export type PlanDefinition = (typeof PLANS)[PlanId];

/** Le seuil d'inactivité (en jours) qui déclenche les alertes commerçant. */
export const INACTIVE_THRESHOLD_DAYS = 21;

/** Délai (en jours) sans aucun scan qui déclenche l'alerte rouge dashboard. */
export const NO_SCAN_ALERT_DAYS = 7;

// ── Helpers de murs ───────────────────────────────────────────────────────────

/** True si le plan a atteint sa limite de clients (MUR 1). */
export function hasReachedClientLimit(plan: PlanId, activeClients: number): boolean {
  const max = PLANS[plan].max_clients;
  if (max === null) return false;
  return activeClients >= max;
}

/** True si les notifications push sont autorisées sur ce plan (MUR 2). */
export function canSendPush(plan: PlanId): boolean {
  return PLANS[plan].push_notifications;
}

/** True si les stats détaillées sont débloquées sur ce plan (MUR 3). */
export function canSeeDetailedStats(plan: PlanId): boolean {
  return PLANS[plan].stats_detailed;
}

/** Plan vers lequel inviter à monter (null si déjà au max). */
export function nextPlan(plan: PlanId): PlanId | null {
  if (plan === 'starter') return 'pro';
  if (plan === 'pro') return 'premium';
  return null;
}

// ── Essai Pro gratuit (migration 008) ─────────────────────────────────────────

/** Durée de l'essai Pro offert à l'inscription commerçant. */
export const TRIAL_DAYS = 60;

/** Nombre de récompenses obtenues à partir duquel un client est « fidèle ». */
export const LOYAL_CLIENT_THRESHOLD = 3;

/** Forme minimale d'un commerçant pour le calcul du plan / de l'essai. */
export interface PlanContext {
  plan: PlanId;
  trial_ends_at: string | null;
  stripe_subscription_id: string | null;
}

/** True si le commerçant est en période d'essai Pro (et pas encore payant). */
export function isInTrial(m: PlanContext): boolean {
  if (m.stripe_subscription_id) return false;
  if (m.plan !== 'starter') return false;
  if (!m.trial_ends_at) return false;
  return new Date(m.trial_ends_at).getTime() > Date.now();
}

/** Nombre de jours restants avant la fin de l'essai (0 si terminé). */
export function trialDaysLeft(m: PlanContext): number {
  if (!m.trial_ends_at) return 0;
  const ms = new Date(m.trial_ends_at).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

/**
 * Plan « effectif » utilisé pour débloquer les fonctionnalités :
 *   - plan payant (pro/premium) si abonnement actif,
 *   - sinon Pro pendant l'essai,
 *   - sinon Starter.
 */
export function getEffectivePlan(m: PlanContext): PlanId {
  if (m.plan !== 'starter') return m.plan;
  if (isInTrial(m)) return 'pro';
  return 'starter';
}
