import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type ViewStyle,
} from 'react-native';

import { theme } from '@/constants/theme';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
}: ButtonProps) {
  const isInactive = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isInactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: isInactive }}
      style={({ pressed }) => [
        styles.base,
        variantStyles[variant],
        isInactive && styles.disabled,
        pressed && !isInactive && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'secondary' || variant === 'ghost' ? theme.colors.primary : '#fff'} />
      ) : (
        <Text style={[styles.label, labelStyles[variant], isInactive && styles.labelDisabled]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    backgroundColor: theme.colors.locked,
    borderColor: theme.colors.locked,
  },
  label: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
  },
  labelDisabled: {
    color: '#fff',
  },
});

const variantStyles: Record<Variant, ViewStyle> = {
  primary: { backgroundColor: theme.colors.primary },
  secondary: {
    backgroundColor: theme.colors.primaryLight,
  },
  danger: { backgroundColor: theme.colors.danger },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
};

const labelStyles: Record<Variant, { color: string }> = {
  primary: { color: '#fff' },
  secondary: { color: theme.colors.primary },
  danger: { color: '#fff' },
  ghost: { color: theme.colors.text },
};
