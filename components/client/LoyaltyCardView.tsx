import { StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';
import type { LoyaltyCardWithDetails } from '@/types';

interface Props {
  card: LoyaltyCardWithDetails;
}

/** Carte de fidélité visuelle (accueil client). */
export function LoyaltyCardView({ card }: Props) {
  const { next_reward, points_to_next } = card;

  const progress =
    next_reward && next_reward.points_required > 0
      ? Math.min(1, card.points / next_reward.points_required)
      : 1;

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <Text style={styles.business} numberOfLines={1}>
          {card.business_name}
        </Text>
        <View style={styles.pointsPill}>
          <Text style={styles.pointsValue}>{card.points}</Text>
          <Text style={styles.pointsLabel}>pts</Text>
        </View>
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>

      <Text style={styles.hint}>
        {next_reward
          ? `Encore ${points_to_next} point${points_to_next > 1 ? 's' : ''} pour « ${next_reward.label} »`
          : 'Toutes les récompenses sont débloquées 🎉'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  business: {
    flex: 1,
    color: '#fff',
    fontSize: theme.fontSize.xl,
    fontWeight: '800',
    marginRight: theme.spacing.sm,
  },
  pointsPill: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    gap: 4,
  },
  pointsValue: { color: '#fff', fontSize: theme.fontSize.xl, fontWeight: '800' },
  pointsLabel: { color: '#fff', fontSize: theme.fontSize.sm },
  progressTrack: {
    height: 8,
    borderRadius: theme.radius.full,
    backgroundColor: 'rgba(255,255,255,0.25)',
    overflow: 'hidden',
    marginBottom: theme.spacing.sm,
  },
  progressFill: {
    height: '100%',
    borderRadius: theme.radius.full,
    backgroundColor: '#fff',
  },
  hint: { color: '#fff', fontSize: theme.fontSize.md, opacity: 0.95 },
});
