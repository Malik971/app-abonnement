/**
 * Intégration Google Wallet (Android uniquement).
 *
 * Le client appuie sur « Ajouter à Google Wallet » → on appelle l'edge function
 * google-wallet-pass qui crée la carte côté Google et renvoie un lien
 * « save to wallet » qu'on ouvre via Linking.
 *
 * Aucune clé Google côté app : tout passe par l'edge function (serveur).
 * iOS n'a pas d'API publique équivalente → le hook est neutre sur iOS.
 */
import { useCallback, useState } from 'react';
import { Linking, Platform } from 'react-native';

import { supabase } from '@/lib/supabase';
import type { LoyaltyCardWithDetails } from '@/types';

export function useGoogleWallet() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Google Wallet n'existe que sur Android.
  const isAndroid = Platform.OS === 'android';

  const clearError = useCallback(() => setError(null), []);

  const addToWallet = useCallback(
    async (card: LoyaltyCardWithDetails, clientFirstName: string | null) => {
      if (!isAndroid) return;

      setLoading(true);
      setError(null);

      try {
        const { data, error: fnError } = await supabase.functions.invoke('google-wallet-pass', {
          body: {
            action: 'generate',
            cardId: card.id,
            merchantId: card.merchant_id,
            merchantName: card.business_name,
            businessType: card.business_type,
            clientFirstName,
            currentPoints: card.points,
            nextRewardPoints: card.next_reward?.points_required ?? 0,
            nextRewardLabel: card.next_reward?.label ?? '',
          },
        });

        if (fnError || !data?.ok) {
          setError('Impossible de générer la carte Wallet.');
          return;
        }

        const { walletLink } = data as { walletLink: string };
        const canOpen = await Linking.canOpenURL(walletLink);
        if (canOpen) {
          await Linking.openURL(walletLink);
        } else {
          setError("Google Wallet n'est pas disponible sur cet appareil.");
        }
      } catch {
        setError('Une erreur est survenue.');
      } finally {
        setLoading(false);
      }
    },
    [isAndroid],
  );

  const updatePoints = useCallback(
    async (card: LoyaltyCardWithDetails) => {
      // Appelé en arrière-plan après un scan réussi, sans feedback UI bloquant.
      if (!isAndroid) return;

      try {
        await supabase.functions.invoke('google-wallet-pass', {
          body: {
            action: 'update_points',
            cardId: card.id,
            currentPoints: card.points,
            nextRewardPoints: card.next_reward?.points_required ?? 0,
            nextRewardLabel: card.next_reward?.label ?? '',
          },
        });
      } catch {
        // Silencieux : si ça échoue, la carte Wallet sera mise à jour au prochain
        // appel à addToWallet. Pas critique.
      }
    },
    [isAndroid],
  );

  return { addToWallet, updatePoints, loading, error, clearError, isAndroid };
}
