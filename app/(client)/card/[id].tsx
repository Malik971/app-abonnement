import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AddToWalletButton } from '@/components/client/AddToWalletButton';
import { LoyaltyCardView } from '@/components/client/LoyaltyCardView';
import { StampAnimation } from '@/components/client/StampAnimation';
import { Button } from '@/components/ui/Button';
import { getDemoCard } from '@/constants/demoCards';
import { theme } from '@/constants/theme';
import { demoCardToView, realCardToView, type CardViewModel } from '@/lib/cardView';
import { ROUTES } from '@/lib/routes';
import { useAuthStore } from '@/stores/authStore';
import { useClientStore } from '@/stores/clientStore';
import { useGuestStore } from '@/stores/guestStore';
import { usePrefsStore } from '@/stores/prefsStore';

export default function CardDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const cards = useClientStore((s) => s.cards);
  const client = useClientStore((s) => s.client);
  const requireAuth = useGuestStore((s) => s.requireAuth);
  const animationsEnabled = usePrefsStore((s) => s.animationsEnabled);

  const isGuest = !session;
  const demo = getDemoCard(id ?? '');
  const realCard = cards.find((c) => c.id === id);

  const view: CardViewModel | null = demo
    ? demoCardToView(demo)
    : realCard
      ? realCardToView(realCard)
      : null;

  // Récompense réclamable (vraie carte uniquement) : un palier déjà atteint.
  const hasAvailableReward =
    !!realCard && realCard.rewards.some((r) => realCard.points >= r.points_required);

  // Outil DEV : simule des scans sur une carte de démo (remplit progressivement).
  const [devFill, setDevFill] = useState<number | null>(null);
  const shownFilled = devFill ?? view?.stampsFilled ?? 0;

  function simulateScan() {
    if (!view) return;
    const next = Math.min(view.stampsTotal, shownFilled + 1);
    setDevFill(next);
    if (animationsEnabled) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      if (next >= view.stampsTotal && view.stampsTotal > 0) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backBtn} accessibilityLabel="Retour">
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </Pressable>
        <Text style={styles.topTitle} numberOfLines={1}>
          {view?.merchantName ?? 'Carte'}
        </Text>
        <View style={styles.backBtn} />
      </View>

      {!view ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Carte introuvable.</Text>
          <Button label="Retour" variant="ghost" onPress={() => router.back()} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Animated.View
            entering={hasAvailableReward && animationsEnabled ? ZoomIn.springify().damping(10) : undefined}
          >
            <LoyaltyCardView
              merchantName={view.merchantName}
              businessType={view.businessType}
              stampsFilled={shownFilled}
              stampsTotal={view.stampsTotal}
              rewardLabel={view.rewardLabel}
              totalVisits={view.totalVisits}
              address={view.address}
              color={view.color}
              isDemo={view.isDemo}
            />
          </Animated.View>

          {/* À propos du commerce (infos personnalisées par le commerçant) */}
          {view.description || view.address || view.businessType ? (
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>À propos</Text>
              {view.description ? <Text style={styles.infoText}>{view.description}</Text> : null}
              {view.address ? (
                <View style={styles.infoRow}>
                  <Ionicons name="location-outline" size={16} color={theme.colors.textSecondary} />
                  <Text style={styles.infoRowText}>{view.address}</Text>
                </View>
              ) : null}
              {view.businessType ? (
                <View style={styles.infoRow}>
                  <Ionicons name="pricetag-outline" size={16} color={theme.colors.textSecondary} />
                  <Text style={styles.infoRowText}>{view.businessType}</Text>
                </View>
              ) : null}
              <Text style={styles.infoCreator}>Proposé par {view.merchantName}</Text>
            </View>
          ) : null}

          {/* Animation de remplissage des tampons (rejoue la progression). */}
          {view.stampsTotal > 0 ? (
            <View style={[styles.animCard, { backgroundColor: view.color ?? theme.colors.primary }]}>
              <Text style={styles.sectionLabel}>TES PASSAGES</Text>
              <StampAnimation
                total={view.stampsTotal}
                initialFilled={0}
                target={shownFilled}
                stampSize={32}
                perRow={Math.min(view.stampsTotal, 5)}
                animate={animationsEnabled}
                haptics={animationsEnabled}
              />
              <Text style={styles.progress}>
                {view.stampsFilled} / {view.stampsTotal} passages
              </Text>
            </View>
          ) : null}

          {/* Actions */}
          {isGuest || view.isDemo ? (
            <View style={styles.actions}>
              {__DEV__ && view.isDemo ? (
                <Button label="DEV : Simuler un scan" variant="secondary" onPress={simulateScan} />
              ) : null}
              <Button
                label="Créer mon compte pour enregistrer cette carte"
                onPress={() => requireAuth('enregistrer cette carte')}
              />
            </View>
          ) : (
            <View style={styles.actions}>
              {realCard ? <AddToWalletButton card={realCard} clientFirstName={client?.first_name ?? null} /> : null}
              {hasAvailableReward ? (
                <Button label="Réclamer ma récompense" onPress={() => router.push(ROUTES.rewards)} />
              ) : null}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  topTitle: { flex: 1, textAlign: 'center', fontFamily: theme.fonts.titleBold, fontSize: theme.fontSize.lg, color: theme.colors.text },
  content: { padding: theme.spacing.md, gap: theme.spacing.lg },
  infoCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  infoTitle: { fontFamily: theme.fonts.titleBold, fontSize: theme.fontSize.md, color: theme.colors.text },
  infoText: { fontSize: theme.fontSize.md, color: theme.colors.textSecondary, lineHeight: 21 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  infoRowText: { flex: 1, fontSize: theme.fontSize.md, color: theme.colors.text },
  infoCreator: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, fontStyle: 'italic', marginTop: theme.spacing.xs },
  animCard: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  sectionLabel: {
    fontFamily: theme.fonts.mono,
    fontSize: 10,
    letterSpacing: 3,
    color: 'rgba(255,255,255,0.85)',
  },
  progress: { fontFamily: theme.fonts.mono, color: theme.colors.cardText, fontSize: theme.fontSize.md },
  actions: { gap: theme.spacing.sm },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.md, padding: theme.spacing.lg },
  emptyText: { fontSize: theme.fontSize.lg, color: theme.colors.textSecondary },
});
