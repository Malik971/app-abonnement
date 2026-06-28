import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { Image, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { brand } from '@/constants/brand';
import { theme } from '@/constants/theme';

interface SplashScreenProps {
  isReady: boolean; // passe à true quand l'app a fini de charger
  onFinish: () => void; // appelé après la transition de sortie
}

const WAVE_PERIOD = 2800;

/** Une onde concentrique qui rayonne depuis le centre (scale 0.3→2.2, fade out). */
function Wave({ size, delay }: { size: number; delay: number }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration: WAVE_PERIOD, easing: Easing.out(Easing.ease) }), -1),
    );
    return () => cancelAnimation(progress);
  }, [delay, progress]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: 0.3 + progress.value * (2.2 - 0.3) }],
    opacity: 0.5 * (1 - progress.value),
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.wave,
        { width: size, height: size, borderRadius: size / 2, marginLeft: -size / 2, marginTop: -size / 2 },
        style,
      ]}
    />
  );
}

export function SplashScreen({ isReady, onFinish }: SplashScreenProps) {
  const { width } = useWindowDimensions();
  const logoWidth = Math.min(width * 0.55, 320); // responsive : 55% de l'écran, plafonné
  const waveSize = width * 0.42;

  const rootOpacity = useSharedValue(1);
  const floatY = useSharedValue(0);
  const spin = useSharedValue(0);

  // Animations en boucle (flottement + rotation).
  useEffect(() => {
    floatY.value = withRepeat(
      withSequence(
        withTiming(-5, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
    );
    spin.value = withRepeat(withTiming(360, { duration: 900, easing: Easing.linear }), -1);
    return () => {
      cancelAnimation(floatY);
      cancelAnimation(spin);
    };
  }, [floatY, spin]);

  // Transition de sortie quand l'app est prête.
  useEffect(() => {
    if (!isReady) return;
    rootOpacity.value = withTiming(0, { duration: 600, easing: Easing.out(Easing.ease) }, (finished) => {
      if (finished) runOnJS(onFinish)();
    });
  }, [isReady, onFinish, rootOpacity]);

  const rootStyle = useAnimatedStyle(() => ({ opacity: rootOpacity.value }));
  const logoStyle = useAnimatedStyle(() => ({ transform: [{ translateY: floatY.value }] }));
  const ringStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value}deg` }] }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.root, rootStyle]} pointerEvents="none">
      <LinearGradient
        colors={[theme.colors.gradientStart, theme.colors.gradientMid, theme.colors.gradientEnd]}
        locations={[0, 0.52, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Bloc central : ondes (derrière) + logo flottant (devant) */}
      <View style={styles.center}>
        <View style={styles.waveAnchor}>
          <Wave size={waveSize} delay={0} />
          <Wave size={waveSize} delay={900} />
          <Wave size={waveSize} delay={1800} />
        </View>

        <Animated.View style={logoStyle}>
          <Image
            source={brand.logoWhite}
            style={{ width: logoWidth, height: logoWidth * (340 / 631) }}
            resizeMode="contain"
          />
        </Animated.View>
      </View>

      {/* Indicateur de chargement */}
      <View style={styles.loaderBlock}>
        <Animated.View style={[styles.ring, ringStyle]} />
        <Text style={styles.loadingText}>CHARGEMENT…</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  center: { alignItems: 'center', justifyContent: 'center' },
  // Point d'ancrage des ondes : centré derrière le logo (zIndex sous le logo).
  waveAnchor: { position: 'absolute', left: '50%', top: '50%', zIndex: -1 },
  wave: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: 'transparent',
  },
  loaderBlock: { position: 'absolute', bottom: '14%', alignItems: 'center', gap: 22 },
  ring: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.28)',
    borderTopColor: '#FFFFFF',
  },
  loadingText: {
    fontFamily: theme.fonts.monoBold,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 5,
    color: 'rgba(255,255,255,0.85)',
  },
});
