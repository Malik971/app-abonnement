import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { PLANS, nextPlan, type PlanId } from '@/constants/plans';
import { theme } from '@/constants/theme';
import { startCheckout } from '@/lib/stripe';

interface UpgradeCardProps {
  merchantId: string;
  currentPlan: PlanId;
  /** Texte d'accroche au-dessus du bouton (ex : « Débloque les notifications »). */
  message?: string;
  /** Libellé personnalisé du bouton. */
  ctaLabel?: string;
}

/** Carte d'upgrade : déclenche le checkout Stripe vers le plan supérieur. */
export function UpgradeCard({ merchantId, currentPlan, message, ctaLabel }: UpgradeCardProps) {
  const target = nextPlan(currentPlan);
  const [loading, setLoading] = useState(false);

  if (!target) return null;

  const targetDef = PLANS[target];

  async function onUpgrade() {
    if (!target) return;
    setLoading(true);
    const res = await startCheckout(merchantId, target);
    setLoading(false);
    if (!res.ok) {
      Alert.alert('Abonnement', res.error ?? 'Impossible de démarrer le paiement.');
    }
  }

  return (
    <View style={styles.card}>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      <Button
        label={ctaLabel ?? `Passer en ${targetDef.label} — ${targetDef.price_eur}€/mois`}
        onPress={onUpgrade}
        loading={loading}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  message: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    fontWeight: '600',
    textAlign: 'center',
  },
});
