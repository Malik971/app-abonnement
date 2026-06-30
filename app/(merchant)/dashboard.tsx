import NetInfo from '@react-native-community/netinfo';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LoyaltyCardView } from '@/components/client/LoyaltyCardView';
import { MerchantQrCard } from '@/components/merchant/MerchantQrCard';
import { UpgradeCard } from '@/components/merchant/UpgradeCard';
import { BrandHeader } from '@/components/ui/BrandHeader';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { LockedOverlay } from '@/components/ui/LockedOverlay';
import { PLANS, canSeeDetailedStats, getEffectivePlan, isInTrial, nextPlan, trialDaysLeft } from '@/constants/plans';
import { theme } from '@/constants/theme';
import { fetchMerchantDashboard } from '@/lib/queries';
import { ROUTES } from '@/lib/routes';
import { startCheckout } from '@/lib/stripe';
import { useMerchantStore } from '@/stores/merchantStore';

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

  // Plan « effectif » : l'essai Pro de 2 mois débloque toutes les fonctions Pro.
  const plan = merchant ? getEffectivePlan(merchant) : 'starter';
  const detailed = canSeeDetailedStats(plan);
  const onTrial = merchant ? isInTrial(merchant) : false;
  const daysLeft = merchant ? trialDaysLeft(merchant) : 0;

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

  // Active l'abonnement Pro (depuis l'essai) sans attendre la fin de la période.
  async function subscribePro() {
    if (!merchant) return;
    const res = await startCheckout(merchant.id, 'pro');
    if (!res.ok) {
      Alert.alert('Abonnement', res.error ?? 'Impossible de démarrer le paiement.');
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <BrandHeader firstName={merchant?.business_name} onAvatarPress={() => router.push(ROUTES.merchantSettings)} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        <Text style={styles.business}>{merchant?.business_name ?? 'Mon commerce'}</Text>
        <Text style={styles.planTag}>{onTrial ? `Essai Pro · ${daysLeft} j restants` : `Plan ${plan}`}</Text>

        {/* Essai Pro : mise en avant de l'abonnement (cœur de la monétisation). */}
        {onTrial ? (
          <View style={styles.trialCard}>
            <Text style={styles.trialTitle}>Essai Pro gratuit — {daysLeft} jour{daysLeft > 1 ? 's' : ''} restant{daysLeft > 1 ? 's' : ''}</Text>
            <Text style={styles.trialText}>
              Tu profites de toutes les fonctionnalités Pro. À la fin de l'essai, le forfait Pro
              ({PLANS.pro.price_eur}€/mois) démarre — sauf si tu annules avant. On te préviendra 7 jours
              puis 1 jour avant.
            </Text>
            <Button label={`Activer Pro maintenant — ${PLANS.pro.price_eur}€/mois`} variant="secondary" onPress={subscribePro} />
          </View>
        ) : null}

        {program ? (
          <MerchantQrCard token={program.qr_code_token} businessName={merchant?.business_name ?? 'Mon commerce'} />
        ) : null}

        {/* Ma carte : aperçu + personnalisation, accessible depuis le tableau de bord. */}
        {merchant ? (
          <View style={styles.cardSection}>
            <Text style={styles.sectionTitle}>Ma carte de fidélité</Text>
            <LoyaltyCardView
              merchantName={merchant.business_name}
              businessType={merchant.business_type ?? undefined}
              stampsFilled={3}
              stampsTotal={Math.max(1, program?.rewards?.[0]?.points_required ?? 8)}
              rewardLabel={program?.rewards?.[0]?.label ?? 'Ta récompense'}
              address={merchant.address ?? undefined}
              color={merchant.card_color ?? undefined}
            />
            <Button
              label="Personnaliser ma carte"
              variant="secondary"
              onPress={() => router.push(ROUTES.merchantSettings)}
            />
          </View>
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
                    {i + 1}. {('first_name' in c ? c.first_name : null) || 'Client'} {'points' in c ? `· ${c.points} passages` : ''}
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
  trialCard: {
    backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  trialTitle: { fontFamily: theme.fonts.titleBold, fontSize: theme.fontSize.lg, color: theme.colors.text },
  trialText: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, lineHeight: 20 },
  cardSection: { gap: theme.spacing.sm },
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
