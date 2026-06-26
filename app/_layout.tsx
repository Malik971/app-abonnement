import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { theme } from '@/constants/theme';
import { useAuthListener } from '@/hooks/useAuth';
import { withTimeout } from '@/lib/async';
import { loadConsent } from '@/lib/consent';
import { useAuthStore } from '@/stores/authStore';

// staleTime de 5 min : offline-first, on garde les données en cache (cf. dashboard).
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function RootNavigator() {
  useAuthListener();

  const router = useRouter();
  const segments = useSegments();
  const initializing = useAuthStore((s) => s.initializing);
  const session = useAuthStore((s) => s.session);
  const role = useAuthStore((s) => s.role);
  const hasConsent = useAuthStore((s) => s.hasConsent);
  const setConsent = useAuthStore((s) => s.setConsent);

  const [consentLoaded, setConsentLoaded] = useState(false);

  // Charge le consentement RGPD persistant au démarrage.
  // Borné par un timeout + catch : le splash ne doit jamais rester bloqué ici.
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
    // Connecté : redirige vers l'espace correspondant au rôle.
    if (role === 'merchant' && group !== '(merchant)') {
      router.replace('/(merchant)/dashboard');
    } else if (role === 'client' && group !== '(client)') {
      router.replace('/(client)');
    } else if (!role && !inAuth) {
      // Rôle inconnu (profil incomplet) : on renvoie vers l'accueil auth.
      router.replace('/(auth)/login');
    }
  }, [initializing, consentLoaded, hasConsent, session, role, segments, router]);

  if (initializing || !consentLoaded) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.background } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="consent" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(client)" />
      <Stack.Screen name="(merchant)" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="dark" />
          <RootNavigator />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
  },
});
