import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';

interface OnboardingSlideProps {
  /** Visuel/animation au centre de l'écran. */
  children: ReactNode;
  title: string;
  subtitle?: string;
}

/** Mise en page commune d'un écran d'onboarding : visuel central + textes courts. */
export function OnboardingSlide({ children, title, subtitle }: OnboardingSlideProps) {
  return (
    <View style={styles.container}>
      <View style={styles.visual}>{children}</View>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: theme.spacing.lg },
  visual: { alignItems: 'center', justifyContent: 'center', marginBottom: theme.spacing.xl },
  title: {
    fontFamily: theme.fonts.titleBold,
    fontSize: theme.fontSize.xxl,
    color: theme.colors.cardText,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: theme.fontSize.lg,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginTop: theme.spacing.sm,
    lineHeight: 24,
  },
});
