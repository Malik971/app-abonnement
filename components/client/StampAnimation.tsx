import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { theme } from '@/constants/theme';

interface StampAnimationProps {
  /** Nombre total de tampons (cases) de la carte. */
  total: number;
  /** Tampons déjà allumés au départ. */
  initialFilled?: number;
  /** Cible à atteindre par l'animation (par défaut : total). */
  target?: number;
  stampSize?: number;
  perRow?: number;
  /** Recommence en boucle (utile pour l'onboarding). */
  loop?: boolean;
  /** Retour haptique à chaque tampon qui s'allume. */
  haptics?: boolean;
  onComplete?: () => void;
}

const STEP_MS = 420;
const LOOP_PAUSE_MS = 1200;

/**
 * Remplit les pastilles une par une, en or, avec un « pop » et un retour
 * haptique à chaque passage. Cœur de l'explication « chaque passage compte ».
 */
export function StampAnimation({
  total,
  initialFilled = 0,
  target,
  stampSize = 34,
  perRow = 5,
  loop = false,
  haptics = true,
  onComplete,
}: StampAnimationProps) {
  const end = Math.min(target ?? total, total);
  const [lit, setLit] = useState(initialFilled);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    function scheduleNext(current: number) {
      if (cancelled) return;
      if (current >= end) {
        onComplete?.();
        if (loop) {
          timer = setTimeout(() => {
            if (cancelled) return;
            setLit(initialFilled);
            scheduleNext(initialFilled);
          }, LOOP_PAUSE_MS);
        }
        return;
      }
      timer = setTimeout(() => {
        if (cancelled) return;
        const next = current + 1;
        setLit(next);
        if (haptics) {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        }
        scheduleNext(next);
      }, STEP_MS);
    }

    setLit(initialFilled);
    scheduleNext(initialFilled);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // Relance proprement si les paramètres changent.
  }, [end, initialFilled, loop, haptics, onComplete]);

  const cells = Array.from({ length: total }, (_, i) => i < lit);
  const rows: boolean[][] = [];
  for (let i = 0; i < cells.length; i += perRow) rows.push(cells.slice(i, i + perRow));

  return (
    <View style={styles.grid}>
      {rows.map((row, rIdx) => (
        <View key={rIdx} style={styles.row}>
          {row.map((isLit, cIdx) => (
            <Stamp key={cIdx} lit={isLit} size={stampSize} />
          ))}
        </View>
      ))}
    </View>
  );
}

function Stamp({ lit, size }: { lit: boolean; size: number }) {
  const p = useSharedValue(lit ? 1 : 0);

  useEffect(() => {
    p.value = withTiming(lit ? 1 : 0, { duration: 340, easing: Easing.out(Easing.back(2)) });
  }, [lit, p]);

  const fillStyle = useAnimatedStyle(() => ({
    opacity: p.value,
    transform: [{ scale: p.value }],
  }));

  return (
    <View style={[styles.stamp, { width: size, height: size, borderRadius: size / 2 }]}>
      <Animated.View style={[styles.stampFill, { borderRadius: size / 2 }, fillStyle]}>
        <Ionicons name="star" size={size * 0.5} color={theme.colors.accent} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { gap: theme.spacing.sm, alignItems: 'center' },
  row: { flexDirection: 'row', gap: theme.spacing.sm, justifyContent: 'center' },
  stamp: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.45)',
  },
  stampFill: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: theme.colors.accent,
    shadowColor: '#FFFFFF',
    shadowOpacity: 0.9,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
});
