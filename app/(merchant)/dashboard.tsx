import NetInfo from '@react-native-community/netinfo';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MerchantQrCard } from '@/components/merchant/MerchantQrCard';
import { UpgradeCard } from '@/components/merchant/UpgradeCard';
import { BrandHeader } from '@/components/ui/BrandHeader';
import { Banner } from '@/components/ui/Banner';
import { Card } from '@/components/ui/Card';
import { LockedOverlay } from '@/components/ui/LockedOverlay';
import { canSeeDetailedStats, nextPlan } from '@/constants/plans';
import { theme } from '@/constants/theme';
import { fetchMerchantDashboard } from '@/lib/queries';
import { startCheckout } from '@/lib/stripe';
import { useMerchantStore } from '@/stores/merchantStore';

export default function DashboardScreen() {
  const merchant = useMerchantStore((s) => s.merchant);
  const program = useMerchantStore((s) => s.program);
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

  // Lance le paiement vers le plan supérieur (utilisé par la carte d'upgrade
  // ET par un tap sur une statistique verrouillée → invitation claire à passer Pro).
  async function handleUpgrade() {
    const target = nextPlan(plan);
    if (!merchant || !target) return;
    const res = await startCheckout(merchant.id, target);
    if (!res.ok) {
      Alert.alert('Abonnement', res.error ?? 'Impossible de démarrer le paiement.');
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <BrandHeader firstName={merchant?.business_name} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        <Text style={styles.business}>{merchant?.business_name ?? 'Mon commerce'}</Text>
        <Text style={styles.planTag}>Plan {plan}</Text>

        {program ? (
          <MerchantQrCard token={program.qr_code_token} businessName={merchant?.business_name ?? 'Mon commerce'} />
        ) : null}

        {!online && dataUpdatedAt ? (
          <Banner tone="neutral" message={`Hors-ligne · données mises à jour il y a ${minutesAgo} min`} />
        ) : null}

        {data?.no_scan_alert ? (
          <Banner tone="danger" message="Aucun passage depuis 7 jours. Pense à relancer tes clients." />
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

            {/* MUR 3 : statistiques détaillées (verrouillées en Starter) */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Statistiques détaillées</Text>
              {!detailed ? <Text style={styles.sectionBadge}>PRO</Text> : null}
            </View>

            {/* Quand c'est verrouillé : l'invitation à passer Pro est mise en avant
                AVANT l'aperçu, directement sur l'écran d'accueil du commerçant. */}
            {!detailed && merchant ? (
              <UpgradeCard
                merchantId={merchant.id}
                currentPlan={plan}
                title="Débloque tes statistiques"
                message="Ces données sont réservées au plan Pro. Active-le pour mieux connaître et relancer tes clients."
                benefits={[
                  'Repère les clients inactifs à relancer',
                  'Classe tes meilleurs clients',
                  'Identifie ton jour le plus chargé',
                  'Notifications push + clients illimités',
                ]}
              />
            ) : null}

            {!detailed ? <Text style={styles.previewLabel}>Aperçu</Text> : null}

            <LockedOverlay locked={!detailed} label="Disponible en Pro" onPressUpgrade={handleUpgrade}>
              <Card style={styles.detailCard}>
                <Text style={styles.detailValue}>{data?.inactive_clients_count ?? 12}</Text>
                <Text style={styles.detailLabel}>Clients inactifs depuis 21+ jours</Text>
              </Card>
            </LockedOverlay>

            <LockedOverlay locked={!detailed} label="Disponible en Pro" onPressUpgrade={handleUpgrade}>
              <Card style={styles.detailCard}>
                <Text style={styles.detailLabel}>Meilleurs clients</Text>
                {(data?.top_clients ?? [{ first_name: 'Marie' }, { first_name: 'Jean' }]).slice(0, 3).map((c, i) => (
                  <Text key={i} style={styles.topClient}>
                    {i + 1}. {('first_name' in c ? c.first_name : null) || 'Client'} {'points' in c ? `· ${c.points} pts` : ''}
                  </Text>
                ))}
              </Card>
            </LockedOverlay>

            <LockedOverlay locked={!detailed} label="Disponible en Pro" onPressUpgrade={handleUpgrade}>
              <Card style={styles.detailCard}>
                <Text style={styles.detailValue}>{data?.busiest_day ?? 'Samedi'}</Text>
                <Text style={styles.detailLabel}>Jour le plus chargé</Text>
              </Card>
            </LockedOverlay>
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
  business: { fontFamily: theme.fonts.titleBold, fontSize: theme.fontSize.xxl, color: theme.colors.text },
  planTag: { fontFamily: theme.fonts.mono, fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 },
  loader: { marginTop: theme.spacing.xxl },
  statsRow: { flexDirection: 'row', gap: theme.spacing.md },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: theme.spacing.lg },
  statCardBig: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  statValue: { fontSize: theme.fontSize.xxl, fontWeight: '800', color: theme.colors.text },
  statValueBig: { color: '#fff', fontSize: theme.fontSize.display },
  statLabel: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, textAlign: 'center', marginTop: theme.spacing.xs },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginTop: theme.spacing.sm },
  sectionTitle: { fontSize: theme.fontSize.md, fontWeight: '700', color: theme.colors.text },
  sectionBadge: {
    fontFamily: theme.fonts.mono,
    fontSize: 10,
    letterSpacing: 1,
    color: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.radius.full,
    overflow: 'hidden',
  },
  previewLabel: {
    fontFamily: theme.fonts.mono,
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  detailCard: { gap: theme.spacing.xs },
  detailValue: { fontSize: theme.fontSize.xxl, fontWeight: '800', color: theme.colors.text },
  detailLabel: { fontSize: theme.fontSize.md, color: theme.colors.textSecondary },
  topClient: { fontSize: theme.fontSize.md, color: theme.colors.text },
});
