import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LoyaltyCardView } from '@/components/client/LoyaltyCardView';
import { Banner } from '@/components/ui/Banner';
import { EmptyState } from '@/components/ui/EmptyState';
import { theme } from '@/constants/theme';
import { useOfflineQueue } from '@/hooks/useOfflineQueue';
import { fetchClientCards } from '@/lib/queries';
import { useClientStore } from '@/stores/clientStore';

export default function ClientHomeScreen() {
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
        <Text style={styles.greeting}>
          {client?.first_name ? `Salut ${client.first_name} 👋` : 'Mes cartes'}
        </Text>
        <Text style={styles.subtitle}>Tes cartes de fidélité</Text>
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
          renderItem={({ item }) => <LoyaltyCardView card={item} />}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          ListEmptyComponent={
            <EmptyState
              emoji="🎟️"
              title="Aucune carte pour l'instant"
              message="Scanne le QR code d'un commerce pour commencer à cumuler des points."
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  header: { paddingHorizontal: theme.spacing.md, paddingTop: theme.spacing.md },
  greeting: { fontSize: theme.fontSize.xxl, fontWeight: '800', color: theme.colors.text },
  subtitle: { fontSize: theme.fontSize.md, color: theme.colors.textSecondary, marginTop: 2 },
  bannerWrap: { paddingHorizontal: theme.spacing.md, paddingTop: theme.spacing.md },
  list: { padding: theme.spacing.md, flexGrow: 1 },
  loader: { marginTop: theme.spacing.xxl },
});
