import { StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';

type Tone = 'info' | 'warning' | 'danger' | 'success' | 'neutral';

interface BannerProps {
  message: string;
  tone?: Tone;
}

/** Bandeau discret (ex : « Données mises à jour il y a X minutes »). */
export function Banner({ message, tone = 'neutral' }: BannerProps) {
  return (
    <View style={[styles.banner, toneStyles[tone].container]}>
      <Text style={[styles.text, toneStyles[tone].text]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.sm,
    marginBottom: theme.spacing.md,
  },
  text: {
    fontSize: theme.fontSize.sm,
    fontWeight: '500',
  },
});

const toneStyles: Record<Tone, { container: object; text: object }> = {
  info: { container: { backgroundColor: theme.colors.primaryLight }, text: { color: theme.colors.primary } },
  warning: { container: { backgroundColor: '#FEF3C7' }, text: { color: theme.colors.warning } },
  danger: { container: { backgroundColor: '#FEE2E2' }, text: { color: theme.colors.danger } },
  success: { container: { backgroundColor: '#DCFCE7' }, text: { color: theme.colors.success } },
  neutral: { container: { backgroundColor: theme.colors.border }, text: { color: theme.colors.textSecondary } },
};
