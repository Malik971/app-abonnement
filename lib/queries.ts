/**
 * Lectures Supabase + calculs dérivés, consommés via TanStack Query.
 * Centralisé ici pour garder les écrans légers et testables.
 */
import { INACTIVE_THRESHOLD_DAYS, NO_SCAN_ALERT_DAYS } from '@/constants/plans';
import { supabase } from '@/lib/supabase';
import type {
  Client,
  LoyaltyCardWithDetails,
  LoyaltyProgram,
  Merchant,
  MerchantClientRow,
  MerchantDashboardStats,
  MerchantSearchResult,
  PlanId,
  Reward,
} from '@/types';

const DAY_MS = 24 * 60 * 60 * 1000;

function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / DAY_MS);
}

/** Calcule la prochaine récompense non atteinte + les points manquants. */
export function computeNextReward(
  points: number,
  rewards: Reward[],
): { next_reward: Reward | null; points_to_next: number } {
  const sorted = [...rewards].sort((a, b) => a.points_required - b.points_required);
  const next = sorted.find((r) => r.points_required > points);
  if (!next) return { next_reward: null, points_to_next: 0 };
  return { next_reward: next, points_to_next: next.points_required - points };
}

// ── Client ────────────────────────────────────────────────────────────────────

export async function fetchClientByUser(userId: string): Promise<Client | null> {
  const { data } = await supabase.from('clients').select('*').eq('user_id', userId).maybeSingle();
  return data ?? null;
}

export async function fetchClientCards(clientId: string): Promise<LoyaltyCardWithDetails[]> {
  const { data, error } = await supabase
    .from('loyalty_cards')
    .select(
      '*, loyalty_programs(rewards), merchants(business_name, business_type, card_color, address, description)',
    )
    .eq('client_id', clientId)
    .order('last_visit_at', { ascending: false, nullsFirst: false });

  if (error || !data) return [];

  return (data as unknown as RawCard[]).map((row) => {
    const rewards = (row.loyalty_programs?.rewards ?? []) as Reward[];
    const { next_reward, points_to_next } = computeNextReward(row.points, rewards);
    return {
      id: row.id,
      client_id: row.client_id,
      program_id: row.program_id,
      merchant_id: row.merchant_id,
      points: row.points,
      total_visits: row.total_visits,
      last_visit_at: row.last_visit_at,
      created_at: row.created_at,
      business_name: row.merchants?.business_name ?? 'Commerce',
      business_type: row.merchants?.business_type ?? null,
      card_color: row.merchants?.card_color ?? null,
      address: row.merchants?.address ?? null,
      description: row.merchants?.description ?? null,
      rewards,
      next_reward,
      points_to_next,
    };
  });
}

interface RawCard {
  id: string;
  client_id: string;
  program_id: string;
  merchant_id: string;
  points: number;
  total_visits: number;
  last_visit_at: string | null;
  created_at: string;
  loyalty_programs: { rewards: Reward[] } | null;
  merchants: {
    business_name: string;
    business_type: string | null;
    card_color: string | null;
    address: string | null;
    description: string | null;
  } | null;
}

/**
 * Utilise une récompense : débite les points et enregistre la transaction.
 * Renvoie un code court à présenter au commerçant.
 * NOTE : opération en deux temps protégée par RLS (le client ne peut toucher
 * que ses propres cartes). Pour un MVP c'est suffisant ; à durcir via RPC
 * atomique si besoin de garanties anti double-utilisation.
 */
export async function redeemReward(
  card: LoyaltyCardWithDetails,
  reward: Reward,
): Promise<{ ok: boolean; code?: string; error?: string }> {
  if (card.points < reward.points_required) {
    return { ok: false, error: 'Points insuffisants.' };
  }

  const { data, error } = await supabase
    .from('redeemed_rewards')
    .insert({
      card_id: card.id,
      reward_label: reward.label,
      points_spent: reward.points_required,
    })
    .select('id')
    .single();

  if (error || !data) return { ok: false, error: error?.message ?? 'Échec.' };

  await supabase
    .from('loyalty_cards')
    .update({ points: card.points - reward.points_required })
    .eq('id', card.id);

  // Code court lisible à montrer en caisse (8 premiers caractères de l'id).
  return { ok: true, code: data.id.replace(/-/g, '').slice(0, 8).toUpperCase() };
}

// ── Fiche client détaillée (commerçant) ──────────────────────────────────────

export interface ScanEntry {
  id: string;
  synced_at: string;
  points_earned: number;
  offline: boolean;
}

export interface RedeemedEntry {
  id: string;
  reward_label: string;
  redeemed_at: string;
}

export interface MerchantClientDetail {
  card_id: string;
  first_name: string | null;
  client_created_at: string | null;
  points: number;
  total_visits: number;
  last_visit_at: string | null;
  rewards: Reward[];
  next_reward: Reward | null;
  points_to_next: number;
  scans: ScanEntry[];
  redeemed: RedeemedEntry[];
  /** Nombre de récompenses déjà obtenues (sert au badge « Client fidèle »). */
  completed_count: number;
}

interface RawClientDetail {
  id: string;
  points: number;
  total_visits: number;
  last_visit_at: string | null;
  clients: { first_name: string | null; created_at: string | null } | null;
  loyalty_programs: { rewards: Reward[] } | null;
}

/**
 * Détail d'un client pour le commerçant (par carte). L'email n'est
 * volontairement PAS exposé (minimisation des données) : le commerçant n'en a
 * pas besoin pour gérer la fidélité.
 */
export async function fetchMerchantClientDetail(cardId: string): Promise<MerchantClientDetail | null> {
  const { data: card } = await supabase
    .from('loyalty_cards')
    .select('id, points, total_visits, last_visit_at, clients(first_name, created_at), loyalty_programs(rewards)')
    .eq('id', cardId)
    .maybeSingle();
  if (!card) return null;

  const raw = card as unknown as RawClientDetail;
  const rewards = raw.loyalty_programs?.rewards ?? [];
  const { next_reward, points_to_next } = computeNextReward(raw.points, rewards);

  const { data: scans } = await supabase
    .from('scans')
    .select('id, synced_at, points_earned, offline')
    .eq('card_id', cardId)
    .order('synced_at', { ascending: false });

  const { data: redeemed } = await supabase
    .from('redeemed_rewards')
    .select('id, reward_label, redeemed_at')
    .eq('card_id', cardId)
    .order('redeemed_at', { ascending: false });

  return {
    card_id: raw.id,
    first_name: raw.clients?.first_name ?? null,
    client_created_at: raw.clients?.created_at ?? null,
    points: raw.points,
    total_visits: raw.total_visits,
    last_visit_at: raw.last_visit_at,
    rewards,
    next_reward,
    points_to_next,
    scans: (scans ?? []) as ScanEntry[],
    redeemed: (redeemed ?? []) as RedeemedEntry[],
    completed_count: (redeemed ?? []).length,
  };
}

// ── Historique (client) ───────────────────────────────────────────────────────

export interface HistoryScan {
  id: string;
  synced_at: string;
  business_name: string;
}

export interface HistoryReward {
  id: string;
  reward_label: string;
  redeemed_at: string;
  business_name: string;
}

export interface ClientHistory {
  scans: HistoryScan[];
  rewards: HistoryReward[];
}

/** Historique du client : passages horodatés et récompenses obtenues. */
export async function fetchClientHistory(clientId: string): Promise<ClientHistory> {
  const { data: scans } = await supabase
    .from('scans')
    .select('id, synced_at, merchants(business_name)')
    .eq('client_id', clientId)
    .order('synced_at', { ascending: false })
    .limit(100);

  // RLS restreint déjà aux récompenses des cartes du client.
  const { data: rewards } = await supabase
    .from('redeemed_rewards')
    .select('id, reward_label, redeemed_at, loyalty_cards(merchants(business_name))')
    .order('redeemed_at', { ascending: false })
    .limit(100);

  const scanList: HistoryScan[] = (scans ?? []).map((r) => {
    const row = r as unknown as { id: string; synced_at: string; merchants: { business_name: string } | null };
    return { id: row.id, synced_at: row.synced_at, business_name: row.merchants?.business_name ?? 'Commerce' };
  });

  const rewardList: HistoryReward[] = (rewards ?? []).map((r) => {
    const row = r as unknown as {
      id: string;
      reward_label: string;
      redeemed_at: string;
      loyalty_cards: { merchants: { business_name: string } | null } | null;
    };
    return {
      id: row.id,
      reward_label: row.reward_label,
      redeemed_at: row.redeemed_at,
      business_name: row.loyalty_cards?.merchants?.business_name ?? 'Commerce',
    };
  });

  return { scans: scanList, rewards: rewardList };
}

// ── Recherche & adhésion (client) ─────────────────────────────────────────────

/** Recherche un commerce par nom (fonction SQL search_merchants). */
export async function searchMerchants(term: string): Promise<MerchantSearchResult[]> {
  const trimmed = term.trim();
  if (trimmed.length === 0) return [];
  const { data, error } = await supabase.rpc('search_merchants', { p_term: trimmed });
  if (error || !data) return [];
  return data as MerchantSearchResult[];
}

export interface JoinResult {
  ok: boolean;
  error?: 'merchant_full' | 'not_found' | 'no_program' | 'not_authenticated' | 'unknown';
  cardId?: string;
  already?: boolean;
}

/** Rejoint le programme de fidélité d'un commerce (crée la carte, MUR 1 inclus). */
export async function joinLoyaltyProgram(merchantId: string): Promise<JoinResult> {
  const { data, error } = await supabase.rpc('join_loyalty_program', {
    p_merchant_id: merchantId,
  });
  if (error) return { ok: false, error: 'unknown' };
  const res = data as { ok: boolean; error?: JoinResult['error']; card_id?: string; already?: boolean };
  return { ok: res.ok, error: res.error, cardId: res.card_id, already: res.already };
}

// ── Commerçant ──────────────────────────────────────────────────────────────

export async function fetchMerchantByUser(userId: string): Promise<Merchant | null> {
  const { data } = await supabase.from('merchants').select('*').eq('user_id', userId).maybeSingle();
  return data ?? null;
}

export async function fetchProgram(merchantId: string): Promise<LoyaltyProgram | null> {
  const { data } = await supabase
    .from('loyalty_programs')
    .select('*')
    .eq('merchant_id', merchantId)
    .maybeSingle();
  return data ?? null;
}

export async function fetchMerchantClients(merchantId: string): Promise<MerchantClientRow[]> {
  const { data, error } = await supabase
    .from('loyalty_cards')
    .select('id, client_id, points, total_visits, last_visit_at, clients(first_name)')
    .eq('merchant_id', merchantId);

  if (error || !data) return [];

  const rows: MerchantClientRow[] = (data as unknown as RawMerchantCard[]).map((row) => {
    const days = daysSince(row.last_visit_at);
    return {
      card_id: row.id,
      client_id: row.client_id,
      first_name: row.clients?.first_name ?? null,
      points: row.points,
      total_visits: row.total_visits,
      last_visit_at: row.last_visit_at,
      days_since_last_visit: days,
      is_inactive: days !== null && days >= INACTIVE_THRESHOLD_DAYS,
    };
  });

  // Tri par défaut : inactifs en premier (jamais venu = très inactif), puis par ancienneté de visite.
  rows.sort((a, b) => (b.days_since_last_visit ?? Infinity) - (a.days_since_last_visit ?? Infinity));
  return rows;
}

interface RawMerchantCard {
  id: string;
  client_id: string | null;
  points: number;
  total_visits: number;
  last_visit_at: string | null;
  clients: { first_name: string | null } | null;
}

export async function fetchMerchantDashboard(
  merchant: Merchant,
  plan: PlanId,
  detailedAllowed: boolean,
): Promise<MerchantDashboardStats> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  // Passages aujourd'hui.
  const { count: visitsToday } = await supabase
    .from('scans')
    .select('id', { count: 'exact', head: true })
    .eq('merchant_id', merchant.id)
    .gte('synced_at', startOfDay.toISOString());

  // Dernier scan (alerte « aucun scan depuis 7 jours »).
  const { data: lastScan } = await supabase
    .from('scans')
    .select('synced_at')
    .eq('merchant_id', merchant.id)
    .order('synced_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const lastScanDays = daysSince(lastScan?.synced_at ?? null);
  const noScanAlert = lastScanDays === null || lastScanDays >= NO_SCAN_ALERT_DAYS;

  const stats: MerchantDashboardStats = {
    active_clients_count: merchant.active_clients_count,
    visits_today: visitsToday ?? 0,
    inactive_clients_count: null,
    top_clients: null,
    busiest_day: null,
    busiest_hour: null,
    no_scan_alert: noScanAlert,
  };

  // MUR 3 : stats détaillées réservées aux plans Pro/Premium.
  if (detailedAllowed) {
    const clients = await fetchMerchantClients(merchant.id);
    stats.inactive_clients_count = clients.filter((c) => c.is_inactive).length;
    stats.top_clients = [...clients].sort((a, b) => b.points - a.points).slice(0, 5);
    const peaks = await fetchPeaks(merchant.id);
    stats.busiest_day = peaks.busiest_day;
    stats.busiest_hour = peaks.busiest_hour;
  }

  return stats;
}

const WEEKDAYS_FR = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

/**
 * Jour et tranche horaire de plus forte affluence sur les 30 derniers jours.
 * Renvoie null si aucun passage (on n'invente pas de valeur par défaut).
 */
async function fetchPeaks(
  merchantId: string,
): Promise<{ busiest_day: string | null; busiest_hour: string | null }> {
  const since = new Date(Date.now() - 30 * DAY_MS).toISOString();
  const { data } = await supabase
    .from('scans')
    .select('synced_at')
    .eq('merchant_id', merchantId)
    .gte('synced_at', since);

  if (!data || data.length === 0) return { busiest_day: null, busiest_hour: null };

  const dayTally = new Array(7).fill(0) as number[];
  const hourTally = new Array(24).fill(0) as number[];
  for (const row of data as { synced_at: string }[]) {
    const d = new Date(row.synced_at);
    dayTally[d.getDay()] = (dayTally[d.getDay()] ?? 0) + 1;
    hourTally[d.getHours()] = (hourTally[d.getHours()] ?? 0) + 1;
  }

  let bestDay = 0;
  for (let i = 1; i < 7; i++) if (dayTally[i]! > dayTally[bestDay]!) bestDay = i;
  let bestHour = 0;
  for (let i = 1; i < 24; i++) if (hourTally[i]! > hourTally[bestHour]!) bestHour = i;

  return {
    busiest_day: WEEKDAYS_FR[bestDay]!,
    busiest_hour: `${bestHour}h-${(bestHour + 1) % 24}h`,
  };
}
