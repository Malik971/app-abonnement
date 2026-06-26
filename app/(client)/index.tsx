import { useQuery } from '@tanstack/react-query';
import { useRouter, type Href } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LoyaltyCardView } from '@/components/client/LoyaltyCardView';
import { Banner } from '@/components/ui/Banner';
import { EmptyState } from '@/components/ui/EmptyState';
import { theme } from '@/constants/theme';
import { useOfflineQueue } from '@/hooks/useOfflineQueue';
import { fetchClientCards } from '@/lib/queries';
import { useClientStore } from '@/stores/clientStore';

// L'écran de recherche est masqué de la barre d'onglets (href: null), donc absent
// des routes typées, mais il reste navigable au runtime → on caste explicitement.
const SEARCH_HREF = '/(client)/search' as unknown as Href;

export default function ClientHomeScreen() {
  const router = useRouter();
  const client = useClientStore((s) => s.client);
  const setCards = useClientStore((s) => s.setCards);
  const { pendingCount } = useOfflineQueue();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['client-cards', client?.id],
    queryFn: async () => {
      const cards = await fetchClientCards(client!.id);
      setCards(cards);
      return cards;
    },
    enabled: Boolean(client?.id),
  });

  const cards = data ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.greeting}>
            {client?.first_name ? `Bonjour ${client.first_name}` : 'Bonjour 👋'}
          </Text>
          <Text style={styles.subtitle}>
            {cards.length > 0
              ? `Tes ${cards.length} carte${cards.length > 1 ? 's' : ''} de fidélité`
              : 'Tes cartes de fidélité'}
          </Text>
        </View>
        <Pressable onPress={() => router.push(SEARCH_HREF)} hitSlop={8} style={styles.addBtn}>
          <Text style={styles.addLabel}>+ Ajouter</Text>
        </Pressable>
      </View>

      {pendingCount > 0 ? (
        <View style={styles.bannerWrap}>
          <Banner
            tone="warning"
            message={`${pendingCount} passage${pendingCount > 1 ? 's' : ''} en attente de synchronisation.`}
          />
        </View>
      ) : null}

      {isLoading ? (
        <ActivityIndicator style={styles.loader} color={theme.colors.primary} />
      ) : (
        <FlatList
          data={cards}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <LoyaltyCardView
              merchantName={item.business_name}
              businessType={item.business_type ?? undefined}
              currentPoints={item.points}
              nextRewardPoints={item.next_reward?.points_required ?? 0}
              nextRewardLabel={item.next_reward?.label ?? ''}
            />
          )}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          ListEmptyComponent={
            <EmptyState
              icon="🎟️"
              title="Tu n'as pas encore de carte de fidélité"
              subtitle="Scanne le QR code d'un commerce ou recherche-le ici."
              actionLabel="Scanner un QR code"
              onAction={() => router.push('/(client)/scan')}
              secondActionLabel="Chercher un commerce"
              onSecondAction={() => router.push(SEARCH_HREF)}
            />
          }
        />
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
  greeting: { fontSize: theme.fontSize.xl, fontWeight: '800', color: theme.colors.text },
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
});
