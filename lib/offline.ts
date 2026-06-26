/**
 * Queue offline + logique de sync.
 *
 * Stratégie offline-first (la connexion en Guadeloupe peut être instable) :
 *   - Un scan sans réseau est stocké dans AsyncStorage (token QR + timestamp).
 *   - Les points sont crédités à la SYNC, pas au scan local.
 *   - useOfflineQueue (hook) déclenche sync_offline_scans côté Supabase quand
 *     la connexion revient.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from '@/lib/supabase';
import type { PendingScan } from '@/types';

const PENDING_KEY = 'offline.pending_scans.v1';

/** Génère un id local (suffisant pour dédoublonner la queue locale). */
export function makeLocalId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function getPendingScans(): Promise<PendingScan[]> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PendingScan[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function setPendingScans(scans: PendingScan[]): Promise<void> {
  await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(scans));
}

/** Ajoute un scan à la queue locale. Retourne l'entrée créée. */
export async function enqueueScan(programQrToken: string): Promise<PendingScan> {
  const entry: PendingScan = {
    localId: makeLocalId(),
    program_qr_token: programQrToken,
    created_locally_at: new Date().toISOString(),
    attempts: 0,
  };
  const current = await getPendingScans();
  await setPendingScans([...current, entry]);
  return entry;
}

export async function removePendingByTokens(tokens: string[]): Promise<void> {
  if (tokens.length === 0) return;
  const current = await getPendingScans();
  // On retire une occurrence par token traité (gère les doublons éventuels).
  const remaining: PendingScan[] = [];
  const toRemove = [...tokens];
  for (const scan of current) {
    const idx = toRemove.indexOf(scan.program_qr_token);
    if (idx >= 0) {
      toRemove.splice(idx, 1);
    } else {
      remaining.push(scan);
    }
  }
  await setPendingScans(remaining);
}

export async function bumpAttempts(localIds: string[]): Promise<void> {
  const current = await getPendingScans();
  await setPendingScans(
    current.map((s) =>
      localIds.includes(s.localId) ? { ...s, attempts: s.attempts + 1 } : s,
    ),
  );
}

export async function clearPendingScans(): Promise<void> {
  await AsyncStorage.removeItem(PENDING_KEY);
}

export interface SyncOutcome {
  appliedCount: number;
  errorCount: number;
  /** Tokens rejetés car le commerce est plein (MUR 1). */
  fullMerchantTokens: string[];
}

/**
 * Envoie tous les scans en attente vers Supabase via sync_offline_scans.
 * Retire de la queue locale ceux qui ont été appliqués (ou définitivement
 * rejetés : qr invalide / commerce plein) ; garde les erreurs réseau pour
 * un prochain essai.
 */
export async function syncPendingScans(clientId: string): Promise<SyncOutcome> {
  const pending = await getPendingScans();
  if (pending.length === 0) {
    return { appliedCount: 0, errorCount: 0, fullMerchantTokens: [] };
  }

  const tokens = pending.map((p) => p.program_qr_token);
  const timestamps = pending.map((p) => p.created_locally_at);

  const { data, error } = await supabase.rpc('sync_offline_scans', {
    p_client_id: clientId,
    p_qr_tokens: tokens,
    p_timestamps: timestamps,
  });

  if (error) {
    // Erreur réseau/serveur : on garde la queue, on incrémente les tentatives.
    await bumpAttempts(pending.map((p) => p.localId));
    throw error;
  }

  const result = data as {
    applied: { token: string }[];
    errors: { token: string; error: string }[];
  };

  const appliedTokens = result.applied.map((a) => a.token);
  // QR invalide ou commerce plein : inutile de réessayer, on purge ces entrées.
  const terminalErrorTokens = result.errors
    .filter((e) => e.error === 'invalid_qr' || e.error === 'merchant_full')
    .map((e) => e.token);
  const fullMerchantTokens = result.errors
    .filter((e) => e.error === 'merchant_full')
    .map((e) => e.token);

  await removePendingByTokens([...appliedTokens, ...terminalErrorTokens]);

  return {
    appliedCount: appliedTokens.length,
    errorCount: result.errors.length,
    fullMerchantTokens,
  };
}
