import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LoyaltyCardView } from '@/components/client/LoyaltyCardView';
import { MerchantQrCard } from '@/components/merchant/MerchantQrCard';
import { ProgressRing } from '@/components/merchant/ProgressRing';
import { UpgradeCard } from '@/components/merchant/UpgradeCard';
import { BrandHeader } from '@/components/ui/BrandHeader';
import { Banner } from '@/components/ui/Banner';
import { Card } from '@/components/ui/Card';
import { LockedOverlay } from '@/components/ui/LockedOverlay';
import { canSeeDetailedStats, getEffectivePlan, nextPlan } from '@/constants/plans';
import { theme } from '@/constants/theme';
import { shade } from '@/lib/color';
import { fetchMerchantDashboard } from '@/lib/queries';
import { ROUTES } from '@/lib/routes';
import { startCheckout } from '@/lib/stripe';
import { useMerchantStore } from '@/stores/merchantStore';

// Rouge de marque adouci pour l'anneau "passages" (le rouge plein est trop dur).
const SOFT_RED = shade(theme.colors.primary, 0.25);

export default function DashboardScreen() {
  const router = useRouter();
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

  // Plan effectif (l'essai Pro débloque les fonctions Pro), sans rien afficher
  // sur l'essai lui-même : le tableau de bord reste focalisé sur l'activité.
  const plan = merchant ? getEffectivePlan(merchant) : 'starter';
  const detailed = canSeeDetailedStats(plan);

  const goalClients = merchant?.goal_clients ?? 50;
  const goalDaily = merchant?.goal_daily_scans ?? 10;

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

  // Données détaillées réellement disponibles (sinon on n'affiche rien plutôt
  // qu'une valeur inventée).
  const topClients = data?.top_clients ?? [];
  const hasTopClients = topClients.length > 0;
  const hasBusiestDay = Boolean(data?.busiest_day);
  const hasBusiestHour = Boolean(data?.busiest_hour);
  const hasInactive = data?.inactive_clients_count != null;

  async function handleUpgrade() {
    const target = nextPlan(plan);
    if (!merchant || !target) return;
    const res = await startCheckout(merchant.id, target);
    if (!res.ok) {
      Alert.alert('Abonnement', res.error ?? 'Impossible de démarrer le paiement.');
    }
  }

  function openMaps() {
    if (!merchant?.address) return;
    const url = `https://maps.google.com/?q=${encodeURIComponent(merchant.address)}`;
    void Linking.openURL(url);
  }

  const previewTotal = Math.max(1, program?.rewards?.[0]?.points_required ?? 8);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <BrandHeader firstName={merchant?.business_name} onAvatarPress={() => router.push(ROUTES.merchantHelp)} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        <Text style={styles.business}>{merchant?.business_name ?? 'Mon commerce'}</Text>
        <Text style={styles.planTag}>Plan {plan}</Text>

        {/* Ma carte : aperçu en haut, tout le bloc mène à la personnalisation. */}
        {merchant ? (
          <View style={styles.cardSection}>
            <Text style={styles.sectionTitle}>Ma carte de fidélité</Text>
            <Pressable onPress={() => router.push(ROUTES.merchantCardDesign)} accessibilityRole="button" accessibilityLabel="Personnaliser ma carte">
              <LoyaltyCardView
                merchantName={merchant.business_name}
                businessType={merchant.business_type ?? undefined}
                stampsFilled={Math.min(3, previewTotal)}
                stampsTotal={previewTotal}
                rewardLabel={program?.rewards?.[0]?.label ?? 'Ta récompense'}
                address={merchant.address ?? undefined}
                color={merchant.card_color ?? undefined}
              />
              <View style={styles.cardHintRow}>
                <Ionicons name="color-palette-outline" size={16} color={theme.colors.primary} />
                <Text style={styles.cardHint}>Personnaliser ma carte</Text>
              </View>
            </Pressable>

            {merchant.address ? (
              <Pressable onPress={openMaps} style={styles.addressRow} accessibilityRole="link">
                <Ionicons name="location-outline" size={16} color={theme.colors.textSecondary} />
                <Text style={styles.addressText}>{merchant.address}</Text>
                <Ionicons name="open-outline" size={14} color={theme.colors.textSecondary} />
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {program ? (
          <MerchantQrCard token={program.qr_code_token} businessName={merchant?.business_name ?? 'Mon commerce'} />
        ) : null}

        {!online && dataUpdatedAt ? (
          <Banner tone="neutral" message={`Hors-ligne, données mises à jour il y a ${minutesAgo} min`} />
        ) : null}

        {data?.no_scan_alert ? (
          <Banner tone="danger" message="Aucun passage depuis 7 jours. Pense à relancer tes clients." />
        ) : null}

        {isLoading ? (
          <ActivityIndicator style={styles.loader} color={theme.colors.primary} />
        ) : (
          <>
            {/* Anneaux de progression : valeur sur objectif. */}
            <View style={styles.ringsRow}>
              <ProgressRing
                value={data?.active_clients_count ?? 0}
                goal={goalClients}
                color={theme.colors.accent}
                label="Clients actifs"
              />
              <ProgressRing
                value={data?.visits_today ?? 0}
                goal={goalDaily}
                color={SOFT_RED}
                label="Passages aujourd'hui"
              />
            </View>

            {/* Statistiques détaillées (verrouillées en Starter). */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Statistiques détaillées</Text>
              {!detailed ? <Text style={styles.sectionBadge}>PRO</Text> : null}
            </View>

            {detailed ? (
              <>
                {hasInactive ? (
                  <Card style={styles.detailCard}>
                    <Text style={styles.detailValue}>{data?.inactive_clients_count}</Text>
                    <Text style={styles.detailLabel}>Clients inactifs depuis 21+ jours</Text>
                  </Card>
                ) : null}

                {hasTopClients ? (
                  <Card style={styles.detailCard}>
                    <Text style={styles.detailLabel}>Tes meilleurs clients</Text>
                    {topClients.slice(0, 3).map((c, i) => (
                      <Text key={c.card_id} style={styles.topClient}>
                        {i + 1}. {c.first_name || 'Client'} · {c.points} passages
                      </Text>
                    ))}
                  </Card>
                ) : null}

                {hasBusiestDay ? (
                  <Card style={styles.detailCard}>
                    <Text style={styles.detailValue}>{data?.busiest_day}</Text>
                    <Text style={styles.detailLabel}>Jour le plus chargé</Text>
                  </Card>
                ) : null}

                {hasBusiestHour ? (
                  <Card style={styles.detailCard}>
                    <Text style={styles.detailValue}>{data?.busiest_hour}</Text>
                    <Text style={styles.detailLabel}>Heure de forte affluence</Text>
                  </Card>
                ) : null}

                {!hasInactive && !hasTopClients && !hasBusiestDay && !hasBusiestHour ? (
                  <Card style={styles.detailCard}>
                    <Text style={styles.detailLabel}>
                      Pas encore assez de passages pour calculer tes statistiques détaillées. Elles
                      apparaîtront après les premiers scans.
                    </Text>
                  </Card>
                ) : null}
              </>
            ) : (
              <>
                {merchant ? (
                  <UpgradeCard
                    merchantId={merchant.id}
                    currentPlan={plan}
                    title="Débloque tes statistiques"
                    message="Mieux connaître tes clients pour les fidéliser : clients à relancer, meilleurs clients, jour le plus chargé."
                    benefits={[
                      'Repère les clients inactifs à relancer',
                      'Classe tes meilleurs clients',
                      'Identifie ton jour le plus chargé',
                      'Notifications push + clients illimités',
                    ]}
                  />
                ) : null}

                <Text style={styles.previewLabel}>Aperçu</Text>
                <LockedOverlay locked label="Disponible en Pro" onPressUpgrade={handleUpgrade}>
                  <Card style={styles.detailCard}>
                    <Text style={styles.detailLabel}>Clients inactifs à relancer</Text>
                  </Card>
                </LockedOverlay>
                <LockedOverlay locked label="Disponible en Pro" onPressUpgrade={handleUpgrade}>
                  <Card style={styles.detailCard}>
                    <Text style={styles.detailLabel}>Tes meilleurs clients</Text>
                  </Card>
                </LockedOverlay>
                <LockedOverlay locked label="Disponible en Pro" onPressUpgrade={handleUpgrade}>
                  <Card style={styles.detailCard}>
                    <Text style={styles.detailLabel}>Ton jour le plus chargé</Text>
                  </Card>
                </LockedOverlay>
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.md, gap: theme.spacing.md },
  business: { fontFamily: theme.fonts.titleBold, fontSize: theme.fontSize.xxl, color: theme.colors.text },
  planTag: { fontFamily: theme.fonts.mono, fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 },
  cardSection: { gap: theme.spacing.sm },
  cardHintRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.xs, marginTop: theme.spacing.xs },
  cardHint: { fontFamily: theme.fonts.title, fontSize: theme.fontSize.sm, color: theme.colors.primary },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, paddingVertical: theme.spacing.xs },
  addressText: { flex: 1, fontSize: theme.fontSize.sm, color: theme.colors.textSecondary },
  loader: { marginTop: theme.spacing.xxl },
  ringsRow: { flexDirection: 'row', gap: theme.spacing.md },
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
