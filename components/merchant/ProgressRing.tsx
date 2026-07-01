import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { theme } from '@/constants/theme';

interface ProgressRingProps {
  /** Valeur courante (ex : clients actifs). */
  value: number;
  /** Objectif à atteindre. */
  goal: number;
  /** Couleur de l'anneau de remplissage. */
  color: string;
  /** Libellé sous l'anneau. */
  label: string;
  size?: number;
}

/**
 * Anneau de progression circulaire (valeur sur objectif).
 * On dessine deux cercles SVG : une piste neutre et l'arc de remplissage
 * piloté par strokeDashoffset. Plus lisible qu'une barre pour un objectif.
 */
export function ProgressRing({ value, goal, color, label, size = 124 }: ProgressRingProps) {
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const ratio = goal > 0 ? Math.min(1, value / goal) : 0;
  const offset = circumference * (1 - ratio);
  const center = size / 2;

  // Légère pulsation quand la valeur change (par exemple après un passage).
  const scale = useSharedValue(1);
  useEffect(() => {
    scale.value = withSequence(withTiming(1.04, { duration: 240 }), withTiming(1, { duration: 220 }));
  }, [value, scale]);
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={[styles.wrap, pulseStyle]}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <Circle cx={center} cy={center} r={radius} stroke={theme.colors.border} strokeWidth={stroke} fill="none" />
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={color}
            strokeWidth={stroke}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform={`rotate(-90 ${center} ${center})`}
          />
        </Svg>
        <View style={[StyleSheet.absoluteFill, styles.center]}>
          <Text style={styles.value}>{value}</Text>
          <Text style={styles.goal}>sur {goal}</Text>
        </View>
      </View>
      <Text style={styles.label}>{label}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', gap: theme.spacing.sm },
  center: { alignItems: 'center', justifyContent: 'center' },
  value: { fontFamily: theme.fonts.titleBold, fontSize: theme.fontSize.xxl, color: theme.colors.text },
  goal: { fontFamily: theme.fonts.mono, fontSize: theme.fontSize.sm, color: theme.colors.textSecondary },
  label: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, textAlign: 'center' },
});
