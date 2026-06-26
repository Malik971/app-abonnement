/**
 * Hook de synchronisation de la queue offline.
 *
 * - Surveille la connexion (NetInfo) et le retour au premier plan (AppState).
 * - Dès que la connexion revient, pousse les scans en attente vers Supabase.
 * - Expose le nombre de scans en attente et un déclencheur manuel.
 */
import NetInfo from '@react-native-community/netinfo';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { getPendingScans, syncPendingScans, type SyncOutcome } from '@/lib/offline';
import { useClientStore } from '@/stores/clientStore';

interface UseOfflineQueueResult {
  pendingCount: number;
  isSyncing: boolean;
  /** Force une tentative de synchronisation (ex : pull-to-refresh). */
  syncNow: () => Promise<SyncOutcome | null>;
  refreshCount: () => Promise<void>;
}

export function useOfflineQueue(): UseOfflineQueueResult {
  const client = useClientStore((s) => s.client);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  // Évite deux syncs concurrentes (NetInfo + AppState peuvent fire ensemble).
  const syncingRef = useRef(false);

  const refreshCount = useCallback(async () => {
    const pending = await getPendingScans();
    setPendingCount(pending.length);
  }, []);

  const syncNow = useCallback(async (): Promise<SyncOutcome | null> => {
    if (!client?.id || syncingRef.current) return null;

    const pending = await getPendingScans();
    if (pending.length === 0) return null;

    syncingRef.current = true;
    setIsSyncing(true);
    try {
      const outcome = await syncPendingScans(client.id);
      await refreshCount();
      return outcome;
    } catch {
      // Erreur réseau : on réessaiera au prochain événement de connexion.
      await refreshCount();
      return null;
    } finally {
      syncingRef.current = false;
      setIsSyncing(false);
    }
  }, [client?.id, refreshCount]);

  // Sync au retour de la connexion.
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable !== false) {
        void syncNow();
      }
    });
    return unsubscribe;
  }, [syncNow]);

  // Sync au retour de l'app au premier plan.
  useEffect(() => {
    const handler = (next: AppStateStatus) => {
      if (next === 'active') void syncNow();
    };
    const sub = AppState.addEventListener('change', handler);
    return () => sub.remove();
  }, [syncNow]);

  // Compteur initial.
  useEffect(() => {
    void refreshCount();
  }, [refreshCount]);

  return { pendingCount, isSyncing, syncNow, refreshCount };
}
