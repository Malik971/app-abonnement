import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CardStack } from '@/components/client/CardStack';
import { Banner } from '@/components/ui/Banner';
import { BrandHeader } from '@/components/ui/BrandHeader';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { DEMO_CARDS } from '@/constants/demoCards';
import { theme } from '@/constants/theme';
import { useOfflineQueue } from '@/hooks/useOfflineQueue';
import { demoCardToView, realCardToView } from '@/lib/cardView';
import { fetchClientCards } from '@/lib/queries';
import { ROUTES } from '@/lib/routes';
import { useAuthStore } from '@/stores/authStore';
import { useClientStore } from '@/stores/clientStore';
import { useGuestStore } from '@/stores/guestStore';

const DEMO_VIEWS = DEMO_CARDS.map(demoCardToView);

export default function ClientHomeScreen() {
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const client = useClientStore((s) => s.client);
  const setCards = useClientStore((s) => s.setCards);
  const requireAuth = useGuestStore((s) => s.requireAuth);
  const { pendingCount } = useOfflineQueue();

  const isGuest = !session;

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['client-cards', client?.id],
    queryFn: async () => {
      const cards = await fetchClientCards(client!.id);
      setCards(cards);
      return cards;
    },
    enabled: Boolean(client?.id),
  });

  const realViews = (data ?? []).map(realCardToView);
  const views = isGuest ? DEMO_VIEWS : realViews;

  function openCard(id: string) {
    router.push(ROUTES.card(id));
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <BrandHeader firstName={client?.first_name} />
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.greeting}>
            {isGuest ? 'Bienvenue' : client?.first_name ? `Bonjour ${client.first_name}` : 'Bonjour'}
          </Text>
          <Text style={styles.subtitle}>
            {isGuest
              ? 'Découvre tes cartes de fidélité'
              : views.length > 0
                ? `Tes ${views.length} carte${views.length > 1 ? 's' : ''} de fidélité`
                : 'Tes cartes de fidélité'}
          </Text>
        </View>
        <Pressable onPress={() => router.push(ROUTES.search)} hitSlop={8} style={styles.addBtn}>
          <Text style={styles.addLabel}>+ Ajouter</Text>
        </Pressable>
      </View>

      {!isGuest && pendingCount > 0 ? (
        <View style={styles.bannerWrap}>
          <Banner
            tone="warning"
            message={`${pendingCount} passage${pendingCount > 1 ? 's' : ''} en attente de synchronisation.`}
          />
        </View>
      ) : null}

      {!isGuest && isLoading ? (
        <ActivityIndicator style={styles.loader} color={theme.colors.primary} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={
            isGuest ? undefined : <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
          }
        >
          {isGuest ? (
            <View style={styles.guestBanner}>
              <Text style={styles.guestTitle}>Tu explores en mode découverte</Text>
              <Text style={styles.guestText}>
                Ces cartes sont des exemples. Crée ton compte pour enregistrer tes vraies cartes.
              </Text>
              <Button
                label="Créer mon compte"
                variant="secondary"
                onPress={() => requireAuth('enregistrer tes cartes')}
              />
            </View>
          ) : null}

          {views.length > 0 ? (
            <CardStack cards={views} onPressCard={openCard} />
          ) : (
            <EmptyState
              icon="card-outline"
              title="Tu n'as pas encore de carte de fidélité"
              subtitle="Scanne le QR code d'un commerce ou recherche-le ici."
              actionLabel="Scanner un QR code"
              onAction={() => router.push(ROUTES.scan)}
              secondActionLabel="Chercher un commerce"
              onSecondAction={() => router.push(ROUTES.search)}
            />
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
  },
  headerText: { flex: 1 },
  greeting: { fontFamily: theme.fonts.titleBold, fontSize: theme.fontSize.xl, color: theme.colors.text },
  subtitle: { fontSize: theme.fontSize.md, color: theme.colors.textSecondary, marginTop: 2 },
  addBtn: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.primaryLight,
  },
  addLabel: { color: theme.colors.primary, fontWeight: '700', fontSize: theme.fontSize.md },
  bannerWrap: { paddingHorizontal: theme.spacing.md, paddingTop: theme.spacing.md },
  list: { padding: theme.spacing.md, gap: theme.spacing.md, flexGrow: 1 },
  loader: { marginTop: theme.spacing.xxl },
  guestBanner: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  guestTitle: { fontFamily: theme.fonts.titleBold, fontSize: theme.fontSize.lg, color: theme.colors.text },
  guestText: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, lineHeight: 19 },
});
