import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { theme } from '@/constants/theme';
import { fetchClientCards, redeemReward } from '@/lib/queries';
import { useClientStore } from '@/stores/clientStore';
import type { LoyaltyCardWithDetails, Reward } from '@/types';

interface RewardItem {
  card: LoyaltyCardWithDetails;
  reward: Reward;
  available: boolean;
}

export default function RewardsScreen() {
  const client = useClientStore((s) => s.client);
  const queryClient = useQueryClient();
  const [redeemCode, setRedeemCode] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const { data: cards = [], isLoading } = useQuery({
    queryKey: ['client-cards', client?.id],
    queryFn: () => fetchClientCards(client!.id),
    enabled: Boolean(client?.id),
  });

  const items: RewardItem[] = cards.flatMap((card) =>
    card.rewards.map((reward) => ({
      card,
      reward,
      available: card.points >= reward.points_required,
    })),
  );
  // Disponibles d'abord.
  items.sort((a, b) => Number(b.available) - Number(a.available));

  async function onUse(item: RewardItem) {
    const key = `${item.card.id}-${item.reward.label}`;
    setBusyKey(key);
    const res = await redeemReward(item.card, item.reward);
    setBusyKey(null);
    if (res.ok && res.code) {
      setRedeemCode(res.code);
      await queryClient.invalidateQueries({ queryKey: ['client-cards', client?.id] });
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Mes récompenses</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator style={styles.loader} color={theme.colors.primary} />
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {items.length === 0 ? (
            <EmptyState
              icon="🎁"
              title="Aucune récompense"
              subtitle="Tes commerces n'ont pas encore configuré de récompenses, ou tu n'as pas encore de carte."
            />
          ) : (
            items.map((item) => {
              const key = `${item.card.id}-${item.reward.label}`;
              return (
                <Card key={key} style={styles.item}>
                  <View style={styles.itemTop}>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemLabel}>{item.reward.label}</Text>
                      <Text style={styles.itemBusiness}>{item.card.business_name}</Text>
                    </View>
                    <Text style={[styles.itemPoints, item.available && styles.itemPointsOk]}>
                      {item.reward.points_required} pts
                    </Text>
                  </View>
                  {item.available ? (
                    <Button
                      label="Utiliser"
                      onPress={() => onUse(item)}
                      loading={busyKey === key}
                    />
                  ) : (
                    <Text style={styles.locked}>
                      Encore {item.reward.points_required - item.card.points} points
                    </Text>
                  )}
                </Card>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Code de récompense à montrer au commerçant */}
      <Modal visible={redeemCode !== null} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Montre ce code en caisse</Text>
            <Text style={styles.code}>{redeemCode}</Text>
            <Text style={styles.modalHint}>
              Le commerçant valide ta récompense avec ce code.
            </Text>
            <Button label="Fermer" onPress={() => setRedeemCode(null)} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  header: { padding: theme.spacing.md },
  title: { fontSize: theme.fontSize.xxl, fontWeight: '800', color: theme.colors.text },
  loader: { marginTop: theme.spacing.xxl },
  list: { padding: theme.spacing.md, gap: theme.spacing.md, flexGrow: 1 },
  item: { gap: theme.spacing.md },
  itemTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  itemInfo: { flex: 1, marginRight: theme.spacing.sm },
  itemLabel: { fontSize: theme.fontSize.lg, fontWeight: '700', color: theme.colors.text },
  itemBusiness: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, marginTop: 2 },
  itemPoints: { fontSize: theme.fontSize.lg, fontWeight: '800', color: theme.colors.locked },
  itemPointsOk: { color: theme.colors.success },
  locked: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, textAlign: 'center' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  modalCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.xl,
    alignItems: 'center',
    gap: theme.spacing.md,
    width: '100%',
  },
  modalTitle: { fontSize: theme.fontSize.lg, fontWeight: '700', color: theme.colors.text },
  code: {
    fontSize: theme.fontSize.display,
    fontWeight: '800',
    letterSpacing: 4,
    color: theme.colors.primary,
  },
  modalHint: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, textAlign: 'center' },
});
