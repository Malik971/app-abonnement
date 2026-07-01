import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/Card';
import { LOYAL_CLIENT_THRESHOLD } from '@/constants/plans';
import { theme } from '@/constants/theme';
import { fetchMerchantClientDetail } from '@/lib/queries';

function formatDate(iso: string | null): string {
  if (!iso) return 'Non renseigné';
  return new Date(iso).toLocaleDateString('fr-FR');
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function MerchantClientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ['merchant-client-detail', id],
    queryFn: () => fetchMerchantClientDetail(id!),
    enabled: Boolean(id),
  });

  const loyal = (data?.completed_count ?? 0) >= LOYAL_CLIENT_THRESHOLD;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.back} accessibilityLabel="Retour">
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </Pressable>
        <Text style={styles.topTitle} numberOfLines={1}>
          {data?.first_name || 'Client'}
        </Text>
        <View style={styles.back} />
      </View>

      {isLoading ? (
        <ActivityIndicator style={styles.loader} color={theme.colors.primary} />
      ) : !data ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Client introuvable.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {/* Identité */}
          <View style={styles.identity}>
            <Text style={styles.name}>{data.first_name || 'Client'}</Text>
            {loyal ? (
              <View style={styles.badge}>
                <Ionicons name="ribbon" size={14} color={theme.colors.accent} />
                <Text style={styles.badgeText}>Client fidèle</Text>
              </View>
            ) : null}
          </View>

          {/* Chiffres clés */}
          <Card style={styles.section}>
            <Row label="Inscrit le" value={formatDate(data.client_created_at)} />
            <Row label="Passages au total" value={String(data.total_visits)} />
            <Row label="Dernier passage" value={formatDate(data.last_visit_at)} />
            <Row label="Tampons en cours" value={String(data.points)} />
          </Card>

          {/* Récompense */}
          <Text style={styles.sectionTitle}>Récompense</Text>
          <Card style={styles.section}>
            {data.next_reward ? (
              <Text style={styles.rewardStatus}>
                En cours : {data.next_reward.label} (encore {data.points_to_next} passage
                {data.points_to_next > 1 ? 's' : ''})
              </Text>
            ) : (
              <Text style={styles.rewardStatus}>Aucune récompense en cours.</Text>
            )}
            {data.redeemed.length > 0 ? (
              <>
                <Text style={styles.subLabel}>Récompenses obtenues</Text>
                {data.redeemed.map((r) => (
                  <Text key={r.id} style={styles.obtained}>
                    {r.reward_label} · {formatDate(r.redeemed_at)}
                  </Text>
                ))}
              </>
            ) : (
              <Text style={styles.muted}>Aucune récompense obtenue pour l'instant.</Text>
            )}
          </Card>

          {/* Historique des passages */}
          <Text style={styles.sectionTitle}>Historique des passages</Text>
          <Card style={styles.section}>
            {data.scans.length === 0 ? (
              <Text style={styles.muted}>Aucun passage enregistré.</Text>
            ) : (
              data.scans.map((s) => (
                <View key={s.id} style={styles.scanRow}>
                  <Ionicons name="checkmark-circle-outline" size={16} color={theme.colors.success} />
                  <Text style={styles.scanText}>{formatDateTime(s.synced_at)}</Text>
                  {s.offline ? <Text style={styles.offlineTag}>hors-ligne</Text> : null}
                </View>
              ))
            )}
          </Card>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  topTitle: { flex: 1, textAlign: 'center', fontFamily: theme.fonts.titleBold, fontSize: theme.fontSize.lg, color: theme.colors.text },
  loader: { marginTop: theme.spacing.xxl },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: theme.fontSize.lg, color: theme.colors.textSecondary },
  content: { padding: theme.spacing.md, gap: theme.spacing.md },
  identity: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, flexWrap: 'wrap' },
  name: { fontFamily: theme.fonts.titleBold, fontSize: theme.fontSize.xxl, color: theme.colors.text },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radius.full,
  },
  badgeText: { fontFamily: theme.fonts.monoBold, fontSize: theme.fontSize.sm, color: theme.colors.primary },
  section: { gap: theme.spacing.sm },
  sectionTitle: { fontSize: theme.fontSize.md, fontWeight: '700', color: theme.colors.text, marginTop: theme.spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  rowLabel: { fontSize: theme.fontSize.md, color: theme.colors.textSecondary },
  rowValue: { fontSize: theme.fontSize.md, color: theme.colors.text, fontWeight: '600' },
  rewardStatus: { fontSize: theme.fontSize.md, color: theme.colors.text },
  subLabel: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, fontWeight: '600', marginTop: theme.spacing.xs },
  obtained: { fontSize: theme.fontSize.md, color: theme.colors.text },
  muted: { fontSize: theme.fontSize.md, color: theme.colors.textSecondary },
  scanRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  scanText: { flex: 1, fontSize: theme.fontSize.md, color: theme.colors.text },
  offlineTag: { fontSize: theme.fontSize.xs, color: theme.colors.textSecondary, fontFamily: theme.fonts.mono },
});
