import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Dimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CardStack } from '@/components/client/CardStack';
import { StampAnimation } from '@/components/client/StampAnimation';
import { OnboardingSlide } from '@/components/onboarding/OnboardingSlide';
import { Button } from '@/components/ui/Button';
import { DEMO_CARDS } from '@/constants/demoCards';
import { theme } from '@/constants/theme';
import { demoCardToView } from '@/lib/cardView';
import { ROUTES } from '@/lib/routes';
import { useGuestStore } from '@/stores/guestStore';

const { width } = Dimensions.get('window');
const SLIDES = 2;
const PREVIEW_CARDS = DEMO_CARDS.slice(0, 3).map(demoCardToView);

/** Onboarding — écrans 2 & 3 : explication de la carte à tampons + portefeuille. */
export default function HowItWorksScreen() {
  const router = useRouter();
  const markOnboardingSeen = useGuestStore((s) => s.markOnboardingSeen);
  const enterGuest = useGuestStore((s) => s.enterGuest);

  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  const isLast = index >= SLIDES - 1;

  function onScrollEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    setIndex(Math.round(e.nativeEvent.contentOffset.x / width));
  }

  function next() {
    scrollRef.current?.scrollTo({ x: width, animated: true });
  }

  async function enter() {
    await markOnboardingSeen();
    await enterGuest();
    router.replace(ROUTES.clientHome);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
      >
        <View style={[styles.slide, { width }]}>
          <OnboardingSlide
            title="Chaque passage te rapproche d'un cadeau."
            subtitle="À chaque visite, un tampon s'allume. Une carte remplie = une récompense."
          >
            <StampAnimation total={8} initialFilled={0} loop haptics={false} stampSize={38} perRow={4} />
          </OnboardingSlide>
        </View>

        <View style={[styles.slide, { width }]}>
          <OnboardingSlide
            title="Toutes tes cartes au même endroit."
            subtitle="Fini les cartes en carton perdues : ton portefeuille de fidélité est dans ta poche."
          >
            <View style={styles.preview} pointerEvents="none">
              <CardStack cards={PREVIEW_CARDS} onPressCard={() => {}} />
            </View>
          </OnboardingSlide>
        </View>
      </ScrollView>

      <View style={styles.dots}>
        {Array.from({ length: SLIDES }, (_, i) => (
          <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>

      <View style={styles.bottom}>
        {isLast ? (
          <Button label="Entrer" variant="secondary" onPress={enter} />
        ) : (
          <Button label="Suivant" variant="secondary" onPress={next} />
        )}
        <Pressable onPress={() => router.push(ROUTES.merchantLogin)} hitSlop={8} style={styles.merchantLink}>
          <Text style={styles.merchantText}>Je suis commerçant</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  slide: { flex: 1 },
  preview: { width: width * 0.74, transform: [{ scale: 0.92 }] },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.md },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.4)' },
  dotActive: { backgroundColor: theme.colors.cardText, width: 22 },
  bottom: { paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.lg, gap: theme.spacing.md },
  merchantLink: { alignSelf: 'center', paddingVertical: theme.spacing.sm },
  merchantText: {
    color: 'rgba(255,255,255,0.85)',
    fontFamily: theme.fonts.mono,
    fontSize: theme.fontSize.sm,
    textDecorationLine: 'underline',
  },
});
