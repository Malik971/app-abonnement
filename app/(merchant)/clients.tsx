import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Banner } from '@/components/ui/Banner';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { canSeeDetailedStats } from '@/constants/plans';
import { theme } from '@/constants/theme';
import { fetchMerchantClients } from '@/lib/queries';
import { ROUTES } from '@/lib/routes';
import { useMerchantStore } from '@/stores/merchantStore';
import type { MerchantClientRow } from '@/types';

const PAGE_SIZE = 20;

export default function ClientsScreen() {
  const router = useRouter();
  const merchant = useMerchantStore((s) => s.merchant);
  const plan = merchant?.plan ?? 'starter';
  const advanced = canSeeDetailedStats(plan); // tri/badges avancés = Pro/Premium
  const [visible, setVisible] = useState(PAGE_SIZE);

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['merchant-clients', merchant?.id],
    queryFn: () => fetchMerchantClients(merchant!.id),
    enabled: Boolean(merchant?.id),
  });

  // Pro : tri « inactifs en premier » (déjà appliqué par fetchMerchantClients).
  // Starter : tri neutre (passages récents d'abord), pas de tri avancé.
  const ordered = useMemo(() => {
    if (advanced) return clients;
    return [...clients].sort(
      (a, b) => (a.days_since_last_visit ?? Infinity) - (b.days_since_last_visit ?? Infinity),
    );
  }, [clients, advanced]);

  const page = ordered.slice(0, visible);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Mes clients</Text>
        <Text style={styles.subtitle}>{clients.length} au total</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator style={styles.loader} color={theme.colors.primary} />
      ) : (
        <FlatList
          data={page}
          keyExtractor={(item) => item.card_id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <ClientRow
              client={item}
              showBadge={advanced}
              onPress={() => router.push(ROUTES.merchantClient(item.card_id))}
            />
          )}
          onEndReachedThreshold={0.4}
          onEndReached={() => setVisible((v) => Math.min(v + PAGE_SIZE, ordered.length))}
          ListHeaderComponent={
            !advanced && clients.length > 0 ? (
              <Banner tone="info" message="Le tri « clients inactifs en premier » est disponible en Pro." />
            ) : null
          }
          ListEmptyComponent={
            <EmptyState icon="people-outline" title="Aucun client" subtitle="Tes clients apparaîtront ici après leur premier passage." />
          }
        />
      )}
    </SafeAreaView>
  );
}

function ClientRow({
  client,
  showBadge,
  onPress,
}: {
  client: MerchantClientRow;
  showBadge: boolean;
  onPress: () => void;
}) {
  const lastVisit =
    client.days_since_last_visit === null
      ? 'Jamais'
      : client.days_since_last_visit === 0
        ? "Aujourd'hui"
        : `Il y a ${client.days_since_last_visit} j`;

  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Voir ${client.first_name || 'ce client'}`}>
      <Card style={styles.row}>
        <View style={styles.rowInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{client.first_name || 'Client'}</Text>
            {showBadge && client.is_inactive ? <View style={styles.badge} /> : null}
          </View>
          <Text style={styles.lastVisit}>Dernière visite : {lastVisit}</Text>
        </View>
        <Text style={styles.points}>{client.points} passages</Text>
        <Ionicons name="chevron-forward" size={18} color={theme.colors.locked} />
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  header: { padding: theme.spacing.md },
  title: { fontSize: theme.fontSize.xxl, fontFamily: theme.fonts.titleBold, color: theme.colors.text },
  subtitle: { fontSize: theme.fontSize.md, color: theme.colors.textSecondary },
  loader: { marginTop: theme.spacing.xxl },
  list: { padding: theme.spacing.md, gap: theme.spacing.sm, flexGrow: 1 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.sm },
  rowInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  name: { fontSize: theme.fontSize.lg, fontWeight: '700', color: theme.colors.text },
  badge: { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.colors.danger },
  lastVisit: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, marginTop: 2 },
  points: { fontSize: theme.fontSize.lg, fontWeight: '800', color: theme.colors.primary },
});
