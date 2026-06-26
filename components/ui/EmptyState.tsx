import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { theme } from '@/constants/theme';

interface EmptyStateProps {
  icon: string; // emoji simple (pas de lib d'icônes)
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondActionLabel?: string;
  onSecondAction?: () => void;
}

export function EmptyState({
  icon,
  title,
  subtitle,
  actionLabel,
  onAction,
  secondActionLabel,
  onSecondAction,
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {actionLabel && onAction ? (
        <View style={styles.actions}>
          <Button label={actionLabel} onPress={onAction} />
          {secondActionLabel && onSecondAction ? (
            <Button label={secondActionLabel} variant="ghost" onPress={onSecondAction} />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xxl,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: 'transparent',
  },
  icon: { fontSize: 64, marginBottom: theme.spacing.md },
  title: {
    fontSize: theme.fontSize.xl,
    fontWeight: '800',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  actions: {
    alignSelf: 'stretch',
    marginTop: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
});
