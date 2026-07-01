import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { LegalScreen } from '@/components/ui/LegalScreen';
import { theme } from '@/constants/theme';
import { fetchClientHistory } from '@/lib/queries';
import { useClientStore } from '@/stores/clientStore';

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR');
}

export default function HistoryScreen() {
  const client = useClientStore((s) => s.client);
  const cards = useClientStore((s) => s.cards);

  const { data, isLoading } = useQuery({
    queryKey: ['client-history', client?.id],
    queryFn: () => fetchClientHistory(client!.id),
    enabled: Boolean(client?.id),
  });

  return (
    <LegalScreen title="Mon historique">
      {/* Cartes en cours */}
      {cards.length > 0 ? (
        <View style={styles.block}>
          <Text style={styles.sectionTitle}>Mes cartes</Text>
          <Card style={styles.card}>
            {cards.map((c) => (
              <View key={c.id} style={styles.lineRow}>
                <Text style={styles.business}>{c.business_name}</Text>
                <Text style={styles.stamps}>{c.points} tampons</Text>
              </View>
            ))}
          </Card>
        </View>
      ) : null}

      {isLoading ? (
        <ActivityIndicator style={styles.loader} color={theme.colors.primary} />
      ) : (
        <>
          {/* Passages */}
          <View style={styles.block}>
            <Text style={styles.sectionTitle}>Mes passages</Text>
            <Card style={styles.card}>
              {(data?.scans.length ?? 0) === 0 ? (
                <Text style={styles.muted}>Aucun passage pour l'instant.</Text>
              ) : (
                data?.scans.map((s) => (
                  <View key={s.id} style={styles.lineRow}>
                    <Ionicons name="checkmark-circle-outline" size={16} color={theme.colors.success} />
                    <Text style={styles.business}>{s.business_name}</Text>
                    <Text style={styles.date}>{formatDateTime(s.synced_at)}</Text>
                  </View>
                ))
              )}
            </Card>
          </View>

          {/* Récompenses obtenues */}
          <View style={styles.block}>
            <Text style={styles.sectionTitle}>Mes récompenses obtenues</Text>
            <Card style={styles.card}>
              {(data?.rewards.length ?? 0) === 0 ? (
                <Text style={styles.muted}>Pas encore de récompense obtenue.</Text>
              ) : (
                data?.rewards.map((r) => (
                  <View key={r.id} style={styles.lineRow}>
                    <Ionicons name="gift-outline" size={16} color={theme.colors.primary} />
                    <Text style={styles.business}>
                      {r.reward_label} · {r.business_name}
                    </Text>
                    <Text style={styles.date}>{formatDate(r.redeemed_at)}</Text>
                  </View>
                ))
              )}
            </Card>
          </View>
        </>
      )}
    </LegalScreen>
  );
}

const styles = StyleSheet.create({
  block: { gap: theme.spacing.sm },
  sectionTitle: { fontFamily: theme.fonts.titleBold, fontSize: theme.fontSize.lg, color: theme.colors.text },
  card: { gap: theme.spacing.sm },
  loader: { marginTop: theme.spacing.lg },
  lineRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  business: { flex: 1, fontSize: theme.fontSize.md, color: theme.colors.text },
  stamps: { fontSize: theme.fontSize.md, color: theme.colors.primary, fontWeight: '700' },
  date: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary },
  muted: { fontSize: theme.fontSize.md, color: theme.colors.textSecondary },
});
