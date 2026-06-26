import { StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';

export interface LoyaltyCardViewProps {
  merchantName: string;
  businessType?: string;
  currentPoints: number;
  nextRewardPoints: number;
  nextRewardLabel: string;
  color?: string; // couleur personnalisable par commerce (pour plus tard)
}

const MAX_STAMPS = 20; // 2 lignes de 10 max
const PER_ROW = 10;

/**
 * Carte à tampons numérique.
 * Grille de pastilles calculée dynamiquement :
 *   filled = currentPoints % nextRewardPoints (points du cycle en cours)
 *   total  = nextRewardPoints
 *   total > 20 → on affiche seulement le chiffre, pas de grille.
 */
export function LoyaltyCardView({
  merchantName,
  businessType,
  currentPoints,
  nextRewardPoints,
  nextRewardLabel,
  color = theme.colors.primary,
}: LoyaltyCardViewProps) {
  const hasReward = nextRewardPoints > 0 && nextRewardLabel.length > 0;
  const total = hasReward ? nextRewardPoints : 0;
  const filled = hasReward ? currentPoints % nextRewardPoints : 0;
  const remaining = hasReward ? total - filled : 0;
  const useGrid = hasReward && total <= MAX_STAMPS;

  return (
    <View style={[styles.card, { backgroundColor: color }]}>
      {/* En-tête */}
      <View style={styles.header}>
        <Text style={styles.business} numberOfLines={1}>
          {merchantName}
        </Text>
        {businessType ? (
          <Text style={styles.type} numberOfLines={1}>
            {businessType}
          </Text>
        ) : null}
      </View>

      {/* Centre : grille de pastilles OU progression chiffrée */}
      {!hasReward ? (
        <View style={styles.center}>
          <Text style={styles.bigNumber}>{currentPoints}</Text>
          <Text style={styles.bigLabel}>points cumulés</Text>
        </View>
      ) : useGrid ? (
        <StampGrid filled={filled} total={total} />
      ) : (
        <View style={styles.center}>
          <Text style={styles.bigNumber}>
            {filled} / {total}
          </Text>
          <Text style={styles.bigLabel}>points</Text>
        </View>
      )}

      {/* Pied : prochaine récompense */}
      <Text style={styles.footer} numberOfLines={2}>
        {!hasReward
          ? 'Continue à cumuler des points 🎉'
          : remaining > 0
            ? `Encore ${remaining} pour : ${nextRewardLabel}`
            : `Récompense prête : ${nextRewardLabel} 🎁`}
      </Text>
    </View>
  );
}

function StampGrid({ filled, total }: { filled: number; total: number }) {
  const stamps = Array.from({ length: total }, (_, i) => i < filled);
  const rows: boolean[][] = [];
  for (let i = 0; i < stamps.length; i += PER_ROW) {
    rows.push(stamps.slice(i, i + PER_ROW));
  }

  return (
    <View style={styles.grid}>
      {rows.map((row, rIdx) => (
        <View key={rIdx} style={styles.row}>
          {row.map((isFilled, cIdx) => (
            <View key={cIdx} style={[styles.stamp, isFilled ? styles.stampFilled : styles.stampEmpty]}>
              {isFilled ? <Text style={styles.stampStar}>★</Text> : null}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

const STAMP = 26;

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: theme.spacing.lg,
    minHeight: 200,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  business: {
    flex: 1,
    color: theme.colors.cardText,
    fontSize: theme.fontSize.xl,
    fontWeight: '800',
  },
  type: {
    color: theme.colors.cardText,
    opacity: 0.8,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
  },
  center: { alignItems: 'center', paddingVertical: theme.spacing.lg },
  bigNumber: { color: theme.colors.cardText, fontSize: theme.fontSize.display, fontWeight: '800' },
  bigLabel: { color: theme.colors.cardText, opacity: 0.85, fontSize: theme.fontSize.md },
  grid: { paddingVertical: theme.spacing.md, gap: theme.spacing.sm, alignItems: 'center' },
  row: { flexDirection: 'row', gap: theme.spacing.sm, justifyContent: 'center' },
  stamp: {
    width: STAMP,
    height: STAMP,
    borderRadius: STAMP / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stampFilled: { backgroundColor: '#FFF7E0' },
  stampEmpty: { borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)', backgroundColor: 'transparent' },
  stampStar: { color: theme.colors.warning, fontSize: 14, fontWeight: '900' },
  footer: { color: theme.colors.cardText, fontSize: theme.fontSize.md, fontWeight: '600' },
});
