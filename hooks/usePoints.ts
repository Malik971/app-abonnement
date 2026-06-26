/**
 * Gestion des points lors d'un scan QR (côté client).
 *
 * Le scan passe TOUJOURS par la fonction serveur sync_offline_scans, qu'on soit
 * en ligne ou non : ainsi la logique métier (création de carte, MUR 1 des 50
 * clients, crédit des points) vit à un seul endroit (la base).
 *   - Hors-ligne : le scan est mis en queue locale, points crédités à la sync.
 *   - En ligne    : on synchronise immédiatement ce scan et on lit le résultat.
 */
import NetInfo from '@react-native-community/netinfo';
import { useCallback } from 'react';

import { enqueueScan } from '@/lib/offline';
import { supabase } from '@/lib/supabase';
import { useClientStore } from '@/stores/clientStore';
import type { ScanResult } from '@/types';

const OFFLINE_MESSAGE =
  'Passage enregistré, sera synchronisé dès que tu as du réseau.';

interface SyncResponse {
  applied: {
    token: string;
    card_id: string;
    points_earned: number;
    new_total: number;
    business_name: string;
  }[];
  errors: { token: string; error: string }[];
}

export function usePoints() {
  const client = useClientStore((s) => s.client);
  const applyScan = useClientStore((s) => s.applyScan);

  const processScan = useCallback(
    async (qrToken: string): Promise<ScanResult> => {
      if (!client?.id) {
        return { ok: false, offline: false, error: 'unknown', message: 'Session client introuvable.' };
      }

      const net = await NetInfo.fetch();
      const online = Boolean(net.isConnected) && net.isInternetReachable !== false;

      if (!online) {
        await enqueueScan(qrToken);
        return { ok: true, offline: true, message: OFFLINE_MESSAGE };
      }

      try {
        const { data, error } = await supabase.rpc('sync_offline_scans', {
          p_client_id: client.id,
          p_qr_tokens: [qrToken],
          p_timestamps: [new Date().toISOString()],
        });

        if (error) {
          // Réseau capricieux : on bascule en offline plutôt que de perdre le scan.
          await enqueueScan(qrToken);
          return { ok: true, offline: true, message: OFFLINE_MESSAGE };
        }

        const res = data as SyncResponse;

        if (res.applied.length > 0) {
          const a = res.applied[0]!;
          applyScan(a.card_id, a.new_total);
          return {
            ok: true,
            offline: false,
            points_earned: a.points_earned,
            new_total: a.new_total,
            business_name: a.business_name,
          };
        }

        const err = res.errors[0];
        if (err?.error === 'merchant_full') {
          return {
            ok: false,
            offline: false,
            error: 'merchant_full',
            message: "Ce commerce n'accepte plus de nouveaux membres pour l'instant.",
          };
        }
        return {
          ok: false,
          offline: false,
          error: 'invalid_qr',
          message: 'QR code non reconnu. Demande au commerçant de réafficher son code.',
        };
      } catch {
        await enqueueScan(qrToken);
        return { ok: true, offline: true, message: OFFLINE_MESSAGE };
      }
    },
    [client?.id, applyScan],
  );

  return { processScan };
}
