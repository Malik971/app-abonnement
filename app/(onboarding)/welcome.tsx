import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Image, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { brand } from '@/constants/brand';
import { theme } from '@/constants/theme';
import { ROUTES } from '@/lib/routes';

/** Onboarding, écran 1 : accroche de marque. */
export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <LinearGradient
      colors={[theme.colors.gradientStart, theme.colors.gradientMid, theme.colors.gradientEnd]}
      locations={[0, 0.52, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.fill}
    >
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Image source={brand.logoWhite} style={styles.logo} resizeMode="contain" />
          <Text style={styles.slogan}>Chaque passage compte.</Text>
        </View>

        <View style={styles.bottom}>
          <Button label="Découvrir" variant="secondary" onPress={() => router.push(ROUTES.howItWorks)} />
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: theme.spacing.lg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 240, height: 240 * (340 / 631) },
  slogan: {
    fontFamily: theme.fonts.title,
    fontSize: theme.fontSize.xl,
    color: theme.colors.cardText,
    marginTop: theme.spacing.md,
  },
  bottom: { paddingBottom: theme.spacing.lg },
});
