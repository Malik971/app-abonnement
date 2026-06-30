/**
 * Planifie deux rappels locaux avant la fin de l'essai Pro (7 jours puis 1 jour),
 * conformément aux bonnes pratiques de transparence sur les abonnements :
 * prévenir l'utilisateur avant tout passage en facturation.
 *
 * Notifications LOCALES (pas de serveur) : l'OS les déclenche même app fermée.
 * Reprogrammées à chaque montée du layout commerçant ; annulées si le commerçant
 * est déjà passé en payant ou si l'essai est terminé.
 */
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';

import { PLANS } from '@/constants/plans';
import type { Merchant } from '@/types';

const ID_7D = 'trial-reminder-7d';
const ID_1D = 'trial-reminder-1d';
const DAY_MS = 86_400_000;

export function useTrialReminders(merchant: Merchant | null | undefined): void {
  const trialEndsAt = merchant?.trial_ends_at ?? null;
  const hasSubscription = Boolean(merchant?.stripe_subscription_id);

  useEffect(() => {
    async function schedule() {
      // On repart d'une ardoise propre pour éviter les doublons.
      await Notifications.cancelScheduledNotificationAsync(ID_7D).catch(() => {});
      await Notifications.cancelScheduledNotificationAsync(ID_1D).catch(() => {});

      if (hasSubscription || !trialEndsAt) return;
      const end = new Date(trialEndsAt).getTime();
      if (Number.isNaN(end)) return;

      const now = Date.now();
      if (end <= now) return; // essai déjà terminé

      const perm = await Notifications.getPermissionsAsync();
      if (perm.status !== 'granted') return;

      const price = `${PLANS.pro.price_eur}€/mois`;
      const d7 = end - 7 * DAY_MS;
      const d1 = end - 1 * DAY_MS;

      if (d7 > now) {
        await Notifications.scheduleNotificationAsync({
          identifier: ID_7D,
          content: {
            title: 'Ton essai Pro se termine dans 7 jours',
            body: `Sans action de ta part, le forfait Pro (${price}) démarrera à la fin de l'essai. Ouvre Fidéli pour gérer ton abonnement.`,
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(d7) },
        });
      }
      if (d1 > now) {
        await Notifications.scheduleNotificationAsync({
          identifier: ID_1D,
          content: {
            title: "Dernier jour d'essai Pro",
            body: `Ton essai se termine demain. Sans annulation, le forfait Pro (${price}) sera activé. Gère ton abonnement dans Fidéli.`,
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(d1) },
        });
      }
    }

    void schedule();
  }, [trialEndsAt, hasSubscription]);
}
