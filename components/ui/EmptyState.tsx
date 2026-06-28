import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { theme } from '@/constants/theme';

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap; // icône au trait (aucun emoji dans l'app)
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
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={44} color={theme.colors.primary} />
      </View>
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
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
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
