import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image, StyleSheet, Text, View } from 'react-native';

import { brand } from '@/constants/brand';
import { theme } from '@/constants/theme';
import { cardGradient } from '@/lib/color';

export interface LoyaltyCardViewProps {
  merchantName: string;
  businessType?: string;
  /** Tampons obtenus dans le cycle en cours. */
  stampsFilled: number;
  /** Tampons nécessaires pour la récompense (0 = aucune récompense configurée). */
  stampsTotal: number;
  rewardLabel: string;
  /** Passages cumulés (affiché si aucune récompense configurée). */
  totalVisits?: number;
  /** Adresse du commerce (affichée sous le nom). */
  address?: string;
  /** Carte de démonstration → badge « Démo ». */
  isDemo?: boolean;
  /** Couleur de marque personnalisée par le commerçant (hex). */
  color?: string;
}

const MAX_STAMPS = 20; // 2 lignes de 10 max
const PER_ROW = 10;

/**
 * Carte à TAMPONS numérique, au style de marque Fidéli :
 * dégradé orange→rouge, ailes en filigrane, pastilles qui s'allument en or.
 * Aucune notion de « points » : uniquement des tampons / passages.
 */
export function LoyaltyCardView({
  merchantName,
  businessType,
  stampsFilled,
  stampsTotal,
  rewardLabel,
  totalVisits = 0,
  address,
  isDemo = false,
  color,
}: LoyaltyCardViewProps) {
  const hasReward = stampsTotal > 0 && rewardLabel.length > 0;
  const total = hasReward ? stampsTotal : 0;
  const filled = hasReward ? Math.min(stampsFilled, total) : 0;
  const remaining = hasReward ? total - filled : 0;
  const useGrid = hasReward && total <= MAX_STAMPS;

  const baseColor = color ?? theme.colors.primary;
  const gradientColors = color
    ? cardGradient(color)
    : ([theme.colors.gradientStart, theme.colors.primary] as const);

  return (
    <View style={[styles.shadow, { shadowColor: baseColor, backgroundColor: baseColor }]}>
      <LinearGradient colors={gradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
        {/* Ailes en filigrane, en haut à droite */}
        <Image source={brand.wingsA} style={styles.wings} resizeMode="contain" />

        {isDemo ? (
          <View style={styles.demoBadge}>
            <Text style={styles.demoText}>DÉMO</Text>
          </View>
        ) : null}

        {/* En-tête */}
        <Text style={styles.label}>CARTE DE FIDÉLITÉ</Text>
        <View style={styles.headerRow}>
          <Text style={styles.business} numberOfLines={1}>
            {merchantName}
          </Text>
          {businessType ? (
            <Text style={styles.type} numberOfLines={1}>
              {businessType}
            </Text>
          ) : null}
        </View>

        {address ? (
          <View style={styles.addressRow}>
            <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.85)" />
            <Text style={styles.address} numberOfLines={1}>
              {address}
            </Text>
          </View>
        ) : null}

        {/* Centre : grille de pastilles OU progression chiffrée */}
        {!hasReward ? (
          <View style={styles.center}>
            <Text style={styles.bigNumber}>{totalVisits}</Text>
            <Text style={styles.bigLabel}>passages cumulés</Text>
          </View>
        ) : useGrid ? (
          <StampGrid filled={filled} total={total} />
        ) : (
          <View style={styles.center}>
            <Text style={styles.bigNumber}>
              {filled} / {total}
            </Text>
            <Text style={styles.bigLabel}>passages</Text>
          </View>
        )}

        {/* Pied : prochaine récompense */}
        <Text style={styles.footer} numberOfLines={2}>
          {!hasReward
            ? 'Continue à cumuler des passages'
            : remaining > 0
              ? `Encore ${remaining} passage${remaining > 1 ? 's' : ''} pour : ${rewardLabel}`
              : `Récompense prête : ${rewardLabel}`}
        </Text>
      </LinearGradient>
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
              {isFilled ? <Ionicons name="star" size={14} color={theme.colors.accent} /> : null}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

const STAMP = 26;

const styles = StyleSheet.create({
  // Ombre rouge portée (sur un wrapper pour que les coins arrondis du dégradé restent nets).
  shadow: {
    borderRadius: theme.radius.lg,
    marginBottom: theme.spacing.md,
    shadowColor: theme.colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 14 },
    elevation: 12,
    backgroundColor: theme.colors.primary, // base d'ombre Android
  },
  card: {
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    minHeight: 200,
    overflow: 'hidden',
    justifyContent: 'space-between',
  },
  wings: {
    position: 'absolute',
    right: -14,
    top: 14,
    width: 150,
    height: 150 * (68 / 257),
    opacity: 0.16,
  },
  demoBadge: {
    position: 'absolute',
    top: theme.spacing.md,
    right: theme.spacing.md,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: theme.radius.full,
  },
  demoText: {
    fontFamily: theme.fonts.monoBold,
    fontSize: 10,
    letterSpacing: 1.5,
    color: theme.colors.primary,
  },
  label: {
    fontFamily: theme.fonts.mono,
    fontSize: 10,
    letterSpacing: 3,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: theme.spacing.sm,
  },
  headerRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: theme.spacing.sm },
  business: { flex: 1, fontFamily: theme.fonts.titleBold, color: theme.colors.cardText, fontSize: theme.fontSize.xl },
  type: { fontFamily: theme.fonts.mono, color: theme.colors.cardText, opacity: 0.8, fontSize: theme.fontSize.sm },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  address: { flex: 1, fontFamily: theme.fonts.mono, color: 'rgba(255,255,255,0.85)', fontSize: theme.fontSize.xs },
  center: { alignItems: 'center', paddingVertical: theme.spacing.lg },
  bigNumber: { fontFamily: theme.fonts.titleBold, color: theme.colors.cardText, fontSize: theme.fontSize.display },
  bigLabel: { fontFamily: theme.fonts.mono, color: theme.colors.cardText, opacity: 0.85, fontSize: theme.fontSize.md },
  grid: { paddingVertical: theme.spacing.md, gap: theme.spacing.sm, alignItems: 'center' },
  row: { flexDirection: 'row', gap: theme.spacing.sm, justifyContent: 'center' },
  stamp: { width: STAMP, height: STAMP, borderRadius: STAMP / 2, alignItems: 'center', justifyContent: 'center' },
  // Pastille gagnée : blanche, halo lumineux + fine bordure dorée (rappel des ailes).
  stampFilled: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: theme.colors.accent,
    shadowColor: '#FFFFFF',
    shadowOpacity: 0.9,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  stampEmpty: { borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)', backgroundColor: 'transparent' },
  footer: { fontFamily: theme.fonts.body, color: theme.colors.cardText, fontSize: theme.fontSize.md },
});
