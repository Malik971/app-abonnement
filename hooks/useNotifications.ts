/**
 * Enregistrement des notifications push pour l'utilisateur courant.
 * À appeler une fois le profil chargé (client ou commerçant) ET le consentement
 * RGPD donné. L'envoi se fait côté serveur, jamais ici.
 */
import { useCallback, useState } from 'react';

import {
  registerForPushNotifications,
  saveClientPushToken,
  saveMerchantPushToken,
} from '@/lib/notifications';
import { useAuthStore } from '@/stores/authStore';

interface UseNotificationsResult {
  registering: boolean;
  /** Demande la permission et enregistre le token sur la bonne table. */
  enablePush: (targetId: string) => Promise<boolean>;
}

export function useNotifications(): UseNotificationsResult {
  const role = useAuthStore((s) => s.role);
  const hasConsent = useAuthStore((s) => s.hasConsent);
  const [registering, setRegistering] = useState(false);

  const enablePush = useCallback(
    async (targetId: string): Promise<boolean> => {
      if (!hasConsent || !role) return false;
      setRegistering(true);
      try {
        const token = await registerForPushNotifications();
        if (!token) return false;
        if (role === 'client') {
          await saveClientPushToken(targetId, token);
        } else {
          await saveMerchantPushToken(targetId, token);
        }
        return true;
      } finally {
        setRegistering(false);
      }
    },
    [role, hasConsent],
  );

  return { registering, enablePush };
}
