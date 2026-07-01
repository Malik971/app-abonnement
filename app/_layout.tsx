import { ChakraPetch_500Medium, ChakraPetch_600SemiBold } from '@expo-google-fonts/chakra-petch';
import {
  Fredoka_400Regular,
  Fredoka_600SemiBold,
  Fredoka_700Bold,
} from '@expo-google-fonts/fredoka';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as ExpoSplash from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SplashScreen as BrandSplash } from '@/components/SplashScreen';
import { theme } from '@/constants/theme';
import { useAuthListener } from '@/hooks/useAuth';
import { ROUTES } from '@/lib/routes';
import { useAuthStore } from '@/stores/authStore';
import { useGuestStore } from '@/stores/guestStore';
import { usePrefsStore } from '@/stores/prefsStore';

// On garde le splash natif visible jusqu'à ce que notre splash animé prenne le relais.
void ExpoSplash.preventAutoHideAsync();

const MIN_SPLASH_MS = 2000;

// staleTime de 5 min : offline-first, on garde les données en cache (cf. dashboard).
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 5 * 60 * 1000, retry: 1, refetchOnWindowFocus: false },
  },
});

function RootContent({ fontsLoaded }: { fontsLoaded: boolean }) {
  useAuthListener();

  const router = useRouter();
  const segments = useSegments();
  const initializing = useAuthStore((s) => s.initializing);
  const session = useAuthStore((s) => s.session);
  const role = useAuthStore((s) => s.role);

  const hydrated = useGuestStore((s) => s.hydrated);
  const onboardingSeen = useGuestStore((s) => s.onboardingSeen);
  const hydrateGuest = useGuestStore((s) => s.hydrate);
  const hydratePrefs = usePrefsStore((s) => s.hydrate);

  const [minElapsed, setMinElapsed] = useState(false);
  const [splashDone, setSplashDone] = useState(false);

  // Charge l'état invité / onboarding et les préférences au démarrage.
  useEffect(() => {
    void hydrateGuest();
    void hydratePrefs();
  }, [hydrateGuest, hydratePrefs]);

  // Durée minimale d'affichage du splash (sinon l'animation clignote).
  useEffect(() => {
    const t = setTimeout(() => setMinElapsed(true), MIN_SPLASH_MS);
    return () => clearTimeout(t);
  }, []);

  // Garde de navigation : expérience CLIENT par défaut, jamais de login forcé.
  useEffect(() => {
    if (initializing || !hydrated) return;
    // Cast : les types de segments générés par Expo Router sont régénérés au
    // prochain `expo start` (ils ne connaissent pas encore le groupe (onboarding)).
    const group = segments[0] as string | undefined;
    const inOnboarding = group === '(onboarding)';
    const inAuth = group === '(auth)';
    const inMerchant = group === '(merchant)';
    const inClient = group === '(client)';

    // 1. Connecté → routage strict par rôle (jamais d'interface mélangée).
    //    Exception : on autorise un utilisateur connecté à revoir l'onboarding.
    if (session) {
      if (inOnboarding) return;
      if (role === 'merchant' && !inMerchant) router.replace(ROUTES.merchantDashboard);
      else if (role !== 'merchant' && !inClient) router.replace(ROUTES.clientHome);
      return;
    }

    // 2. Non connecté, jamais vu l'onboarding → onboarding.
    //    On laisse passer l'espace auth (lien « Je suis commerçant » depuis l'onboarding).
    if (!onboardingSeen) {
      if (!inOnboarding && !inAuth) router.replace(ROUTES.onboarding);
      return;
    }

    // 3. Non connecté, onboarding vu :
    //    - l'espace commerçant exige une connexion,
    //    - les écrans auth / client (invité) / onboarding sont publics,
    //    - tout le reste → home client en mode invité.
    if (inMerchant) {
      router.replace(ROUTES.merchantLogin);
      return;
    }
    if (inAuth || inClient || inOnboarding) return;
    router.replace(ROUTES.clientHome);
  }, [initializing, hydrated, onboardingSeen, session, role, segments, router]);

  // « Prête » = polices chargées ET session vérifiée ET état invité chargé ET 2s écoulées.
  const isReady = fontsLoaded && !initializing && hydrated && minElapsed;

  // Révélation de l'app : zoom arrière (scale 1.04 → 1) + fondu, déclenché quand prête.
  const reveal = useSharedValue(0);
  useEffect(() => {
    if (isReady) {
      reveal.value = withTiming(1, { duration: 700, easing: Easing.out(Easing.ease) });
    }
  }, [isReady, reveal]);
  const appStyle = useAnimatedStyle(() => ({
    opacity: reveal.value,
    transform: [{ scale: 1.04 - reveal.value * 0.04 }],
  }));

  return (
    <>
      <Animated.View style={[styles.flex, appStyle]}>
        <Stack
          screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.background } }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="(onboarding)" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(client)" />
          <Stack.Screen name="(merchant)" />
        </Stack>
      </Animated.View>

      {!splashDone ? <BrandSplash isReady={isReady} onFinish={() => setSplashDone(true)} /> : null}
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Fredoka_400Regular,
    Fredoka_600SemiBold,
    Fredoka_700Bold,
    ChakraPetch_500Medium,
    ChakraPetch_600SemiBold,
  });

  // Masque le splash natif dès que le JS est monté : notre splash animé prend le relais.
  useEffect(() => {
    void ExpoSplash.hideAsync().catch(() => {});
  }, []);

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="light" />
          <RootContent fontsLoaded={fontsLoaded} />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
