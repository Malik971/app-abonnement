import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';

interface LockedOverlayProps {
  /** Contenu réel (affiché grisé dessous), pour « montrer la fonctionnalité verrouillée ». */
  children: ReactNode;
  label?: string;
  locked?: boolean;
  onPressUpgrade?: () => void;
}

/**
 * Affiche son contenu grisé avec un cadenas et un texte « Disponible en Pro ».
 * On NE cache PAS la fonctionnalité : on la montre verrouillée (cf. murs 2 & 3).
 */
export function LockedOverlay({
  children,
  label = 'Disponible en Pro',
  locked = true,
  onPressUpgrade,
}: LockedOverlayProps) {
  if (!locked) return <>{children}</>;

  return (
    <View style={styles.wrapper}>
      <View style={styles.dimmed} pointerEvents="none">
        {children}
      </View>
      <Pressable
        style={styles.overlay}
        onPress={onPressUpgrade}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <Ionicons name="lock-closed" size={26} color={theme.colors.locked} />
        <Text style={styles.label}>{label}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
  },
  dimmed: {
    opacity: 0.35,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(249,250,251,0.55)',
    gap: theme.spacing.xs,
  },
  label: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    color: theme.colors.locked,
  },
});
