import { Image, StyleSheet, Text, View } from 'react-native';

import { brand } from '@/constants/brand';
import { theme } from '@/constants/theme';

interface BrandHeaderProps {
  /** Prénom de l'utilisateur (pour l'initiale de l'avatar). */
  firstName?: string | null;
}

const LOGO_H = 30;

/** En-tête de marque : logo Fidéli à gauche, avatar avec initiale à droite. */
export function BrandHeader({ firstName }: BrandHeaderProps) {
  const initial = (firstName?.trim()?.[0] ?? '?').toUpperCase();

  return (
    <View style={styles.row}>
      <Image source={brand.logoHome} style={styles.logo} resizeMode="contain" />
      <View style={styles.avatar}>
        <Text style={styles.initial}>{initial}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
  },
  logo: { height: LOGO_H, width: LOGO_H * (623 / 242) },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: { fontFamily: theme.fonts.titleBold, color: theme.colors.primary, fontSize: theme.fontSize.md },
});
