import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { PLANS, nextPlan, type PlanId } from '@/constants/plans';
import { theme } from '@/constants/theme';
import { startCheckout } from '@/lib/stripe';

interface UpgradeCardProps {
  merchantId: string;
  currentPlan: PlanId;
  /** Titre de la carte (par défaut « Passez en <plan> »). */
  title?: string;
  /** Texte d'accroche sous le titre. */
  message?: string;
  /** Liste d'avantages débloqués (affichés avec une coche). */
  benefits?: string[];
  /** Libellé personnalisé du bouton. */
  ctaLabel?: string;
}

/** Carte d'upgrade : déclenche le checkout Stripe vers le plan supérieur. */
export function UpgradeCard({
  merchantId,
  currentPlan,
  title,
  message,
  benefits,
  ctaLabel,
}: UpgradeCardProps) {
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
      <View style={styles.header}>
        <View style={styles.iconCircle}>
          <Ionicons name="rocket-outline" size={18} color={theme.colors.primary} />
        </View>
        <Text style={styles.title}>{title ?? `Passez en ${targetDef.label}`}</Text>
      </View>

      {message ? <Text style={styles.message}>{message}</Text> : null}

      {benefits && benefits.length > 0 ? (
        <View style={styles.benefits}>
          {benefits.map((b) => (
            <View key={b} style={styles.benefitRow}>
              <Ionicons name="checkmark-circle" size={16} color={theme.colors.success} />
              <Text style={styles.benefitText}>{b}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <Button
        label={ctaLabel ?? `Passer en ${targetDef.label} à ${targetDef.price_eur}€/mois`}
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
    gap: theme.spacing.sm,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { flex: 1, fontFamily: theme.fonts.titleBold, fontSize: theme.fontSize.lg, color: theme.colors.text },
  message: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, lineHeight: 20 },
  benefits: { gap: theme.spacing.xs, marginVertical: theme.spacing.xs },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  benefitText: { flex: 1, fontSize: theme.fontSize.md, color: theme.colors.text },
});
