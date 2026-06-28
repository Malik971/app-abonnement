import { Image, StyleSheet, View } from 'react-native';

import { brand } from '@/constants/brand';
import { theme } from '@/constants/theme';

interface BrandWordmarkProps {
  /** Largeur du logo (px). */
  width?: number;
}

/**
 * Logo Fidéli couleur centré, pour les écrans d'entrée (connexion, inscription,
 * consentement) où l'identité de marque doit être visible d'emblée.
 */
export function BrandWordmark({ width = 170 }: BrandWordmarkProps) {
  return (
    <View style={styles.wrap}>
      <Image
        source={brand.logoColor}
        style={{ width, height: width * (340 / 631) }}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
});
