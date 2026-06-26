import NetInfo from '@react-native-community/netinfo';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { UpgradeCard } from '@/components/merchant/UpgradeCard';
import { Banner } from '@/components/ui/Banner';
import { Card } from '@/components/ui/Card';
import { LockedOverlay } from '@/components/ui/LockedOverlay';
import { canSeeDetailedStats } from '@/constants/plans';
import { theme } from '@/constants/theme';
import { fetchMerchantDashboard } from '@/lib/queries';
import { useMerchantStore } from '@/stores/merchantStore';

export default function DashboardScreen() {
  const merchant = useMerchantStore((s) => s.merchant);
  const setStats = useMerchantStore((s) => s.setStats);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((s) =>
      setOnline(Boolean(s.isConnected) && s.isInternetReachable !== false),
    );
    return unsub;
  }, []);

  const plan = merchant?.plan ?? 'starter';
  const detailed = canSeeDetailedStats(plan);

  const { data, isLoading, refetch, isRefetching, dataUpdatedAt } = useQuery({
    queryKey: ['dashboard', merchant?.id, plan],
    queryFn: async () => {
      const stats = await fetchMerchantDashboard(merchant!, plan, detailed);
      setStats(stats);
      return stats;
    },
    enabled: Boolean(merchant?.id),
  });

  const minutesAgo = Math.max(0, Math.round((Date.now() - dataUpdatedAt) / 60000));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        <Text style={styles.business}>{merchant?.business_name ?? 'Mon commerce'}</Text>
        <Text style={styles.planTag}>Plan {plan}</Text>

        {!online && dataUpdatedAt ? (
          <Banner tone="neutral" message={`Hors-ligne · données mises à jour il y a ${minutesAgo} min`} />
        ) : null}

        {data?.no_scan_alert ? (
          <Banner tone="danger" message="⚠️ Aucun passage depuis 7 jours. Pense à relancer tes clients." />
        ) : null}

        {isLoading ? (
          <ActivityIndicator style={styles.loader} color={theme.colors.primary} />
        ) : (
          <>
            {/* Stat principale + secondaire */}
            <View style={styles.statsRow}>
              <StatCard big value={data?.active_clients_count ?? 0} label="Clients actifs" />
              <StatCard value={data?.visits_today ?? 0} label="Passages aujourd'hui" />
            </View>

            {/* MUR 3 : blocs détaillés (verrouillés en Starter) */}
            <Text style={styles.sectionTitle}>Statistiques détaillées</Text>

            <LockedOverlay locked={!detailed} label="Disponible en Pro">
              <Card style={styles.detailCard}>
                <Text style={styles.detailValue}>{data?.inactive_clients_count ?? 12}</Text>
                <Text style={styles.detailLabel}>Clients inactifs depuis 21+ jours</Text>
              </Card>
            </LockedOverlay>

            <LockedOverlay locked={!detailed} label="Disponible en Pro">
              <Card style={styles.detailCard}>
                <Text style={styles.detailLabel}>Meilleurs clients</Text>
                {(data?.top_clients ?? [{ first_name: 'Marie' }, { first_name: 'Jean' }]).slice(0, 3).map((c, i) => (
                  <Text key={i} style={styles.topClient}>
                    {i + 1}. {('first_name' in c ? c.first_name : null) || 'Client'} {'points' in c ? `· ${c.points} pts` : ''}
                  </Text>
                ))}
              </Card>
            </LockedOverlay>

            <LockedOverlay locked={!detailed} label="Disponible en Pro">
              <Card style={styles.detailCard}>
                <Text style={styles.detailValue}>{data?.busiest_day ?? 'Samedi'}</Text>
                <Text style={styles.detailLabel}>Jour le plus chargé</Text>
              </Card>
            </LockedOverlay>

            {!detailed && merchant ? (
              <UpgradeCard
                merchantId={merchant.id}
                currentPlan={plan}
                message="Débloque tes statistiques détaillées pour fidéliser plus."
              />
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ value, label, big = false }: { value: number; label: string; big?: boolean }) {
  return (
    <Card style={[styles.statCard, big && styles.statCardBig]}>
      <Text style={[styles.statValue, big && styles.statValueBig]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.md, gap: theme.spacing.md },
  business: { fontSize: theme.fontSize.xxl, fontWeight: '800', color: theme.colors.text },
  planTag: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, textTransform: 'capitalize', marginTop: -theme.spacing.xs },
  loader: { marginTop: theme.spacing.xxl },
  statsRow: { flexDirection: 'row', gap: theme.spacing.md },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: theme.spacing.lg },
  statCardBig: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  statValue: { fontSize: theme.fontSize.xxl, fontWeight: '800', color: theme.colors.text },
  statValueBig: { color: '#fff', fontSize: theme.fontSize.display },
  statLabel: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, textAlign: 'center', marginTop: theme.spacing.xs },
  sectionTitle: { fontSize: theme.fontSize.md, fontWeight: '700', color: theme.colors.text, marginTop: theme.spacing.sm },
  detailCard: { gap: theme.spacing.xs },
  detailValue: { fontSize: theme.fontSize.xxl, fontWeight: '800', color: theme.colors.text },
  detailLabel: { fontSize: theme.fontSize.md, color: theme.colors.textSecondary },
  topClient: { fontSize: theme.fontSize.md, color: theme.colors.text },
});
