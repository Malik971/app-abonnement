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
import { withTimeout } from '@/lib/async';
import { loadConsent } from '@/lib/consent';
import { useAuthStore } from '@/stores/authStore';

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
  const hasConsent = useAuthStore((s) => s.hasConsent);
  const setConsent = useAuthStore((s) => s.setConsent);

  const [consentLoaded, setConsentLoaded] = useState(false);
  const [minElapsed, setMinElapsed] = useState(false);
  const [splashDone, setSplashDone] = useState(false);

  // Durée minimale d'affichage du splash (sinon l'animation clignote).
  useEffect(() => {
    const t = setTimeout(() => setMinElapsed(true), MIN_SPLASH_MS);
    return () => clearTimeout(t);
  }, []);

  // Charge le consentement RGPD persistant au démarrage (borné, jamais bloquant).
  useEffect(() => {
    let active = true;
    withTimeout(loadConsent(), 5000, false)
      .catch(() => false)
      .then((granted) => {
        if (!active) return;
        setConsent(granted);
        setConsentLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [setConsent]);

  // Garde d'authentification + consentement.
  useEffect(() => {
    if (initializing || !consentLoaded) return;
    const group = segments[0];
    const inConsent = group === 'consent';
    const inAuth = group === '(auth)';

    if (!hasConsent) {
      if (!inConsent) router.replace('/consent');
      return;
    }
    if (!session) {
      if (!inAuth) router.replace('/(auth)/login');
      return;
    }
    if (role === 'merchant' && group !== '(merchant)') {
      router.replace('/(merchant)/dashboard');
    } else if (role === 'client' && group !== '(client)') {
      router.replace('/(client)');
    } else if (!role && !inAuth) {
      router.replace('/(auth)/login');
    }
  }, [initializing, consentLoaded, hasConsent, session, role, segments, router]);

  // « Prête » = polices chargées ET session vérifiée ET consentement résolu ET 2s écoulées.
  const isReady = fontsLoaded && !initializing && consentLoaded && minElapsed;

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
          <Stack.Screen name="consent" />
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
