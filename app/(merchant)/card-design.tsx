import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LoyaltyCardView } from '@/components/client/LoyaltyCardView';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { theme } from '@/constants/theme';
import { CARD_PALETTE, DEFAULT_CARD_COLOR } from '@/lib/color';
import { supabase } from '@/lib/supabase';
import { useMerchantStore } from '@/stores/merchantStore';

const MIN_STAMPS = 5;
const MAX_STAMPS = 15;
const MAX_REWARD_CHARS = 60;

/**
 * Personnalisation de la carte de fidélité (accessible depuis le tableau de bord).
 * Couleur de fond, nombre de tampons et libellé de la récompense, avec aperçu
 * en temps réel. Tout est enregistré en une seule action.
 */
export default function CardDesignScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const merchant = useMerchantStore((s) => s.merchant);
  const program = useMerchantStore((s) => s.program);
  const setMerchant = useMerchantStore((s) => s.setMerchant);
  const setProgram = useMerchantStore((s) => s.setProgram);

  const firstReward = program?.rewards?.[0];
  const [color, setColor] = useState(merchant?.card_color ?? DEFAULT_CARD_COLOR);
  const [stamps, setStamps] = useState(clampStamps(firstReward?.points_required ?? 10));
  const [reward, setReward] = useState(firstReward?.label ?? '');
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!merchant || !program) return;
    setSaving(true);

    // Couleur sur le commerce, récompense principale sur le programme.
    // On garde les éventuelles autres récompenses déjà configurées.
    await supabase.from('merchants').update({ card_color: color }).eq('id', merchant.id);

    const rewards = program.rewards.length > 0 ? [...program.rewards] : [];
    rewards[0] = { points_required: stamps, label: reward.trim() || 'Récompense' };
    const { data: updated } = await supabase
      .from('loyalty_programs')
      .update({ rewards })
      .eq('id', program.id)
      .select('*')
      .single();

    if (updated) setProgram(updated);
    setMerchant({ ...merchant, card_color: color });
    await queryClient.invalidateQueries({ queryKey: ['merchant', merchant.user_id] });

    setSaving(false);
    Alert.alert('Carte enregistrée', 'Ta carte de fidélité a été mise à jour.');
    router.back();
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.back} accessibilityLabel="Retour">
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </Pressable>
        <Text style={styles.topTitle}>Ma carte</Text>
        <View style={styles.back} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Aperçu temps réel */}
        <LoyaltyCardView
          merchantName={merchant?.business_name ?? 'Mon commerce'}
          businessType={merchant?.business_type ?? undefined}
          stampsFilled={Math.min(3, stamps)}
          stampsTotal={stamps}
          rewardLabel={reward.trim() || 'Ta récompense'}
          address={merchant?.address ?? undefined}
          color={color}
        />

        {/* Couleur */}
        <Text style={styles.label}>Couleur de la carte</Text>
        <View style={styles.palette}>
          {CARD_PALETTE.map((c) => (
            <Pressable
              key={c}
              onPress={() => setColor(c)}
              accessibilityRole="button"
              accessibilityLabel={`Couleur ${c}`}
              style={[styles.swatch, { backgroundColor: c }, color === c && styles.swatchSelected]}
            />
          ))}
        </View>

        {/* Nombre de tampons */}
        <Text style={styles.label}>Nombre de tampons pour la récompense</Text>
        <View style={styles.stepper}>
          <Pressable
            onPress={() => setStamps((s) => Math.max(MIN_STAMPS, s - 1))}
            disabled={stamps <= MIN_STAMPS}
            hitSlop={8}
          >
            <Ionicons name="remove-circle" size={40} color={stamps <= MIN_STAMPS ? theme.colors.locked : theme.colors.primary} />
          </Pressable>
          <Text style={styles.stepperValue}>{stamps}</Text>
          <Pressable
            onPress={() => setStamps((s) => Math.min(MAX_STAMPS, s + 1))}
            disabled={stamps >= MAX_STAMPS}
            hitSlop={8}
          >
            <Ionicons name="add-circle" size={40} color={stamps >= MAX_STAMPS ? theme.colors.locked : theme.colors.primary} />
          </Pressable>
        </View>
        <Text style={styles.hint}>Entre {MIN_STAMPS} et {MAX_STAMPS} passages.</Text>

        {/* Récompense */}
        <Input
          label="Récompense"
          placeholder="Ex : 1 café offert"
          value={reward}
          onChangeText={(t) => setReward(t.slice(0, MAX_REWARD_CHARS))}
          maxLength={MAX_REWARD_CHARS}
        />
        <Text style={styles.counter}>{reward.length}/{MAX_REWARD_CHARS}</Text>

        <Button label="Enregistrer ma carte" onPress={save} loading={saving} style={styles.saveBtn} />
      </ScrollView>
    </SafeAreaView>
  );
}

function clampStamps(n: number): number {
  if (n < MIN_STAMPS) return MIN_STAMPS;
  if (n > MAX_STAMPS) return MAX_STAMPS;
  return n;
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
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  topTitle: { flex: 1, textAlign: 'center', fontFamily: theme.fonts.titleBold, fontSize: theme.fontSize.lg, color: theme.colors.text },
  content: { padding: theme.spacing.md, gap: theme.spacing.md, paddingBottom: theme.spacing.xxl },
  label: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, fontWeight: '600', marginTop: theme.spacing.sm },
  palette: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  swatch: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: theme.colors.border },
  swatchSelected: { borderWidth: 3, borderColor: theme.colors.text },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.xl },
  stepperValue: { fontFamily: theme.fonts.titleBold, fontSize: theme.fontSize.display, color: theme.colors.text, minWidth: 56, textAlign: 'center' },
  hint: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, textAlign: 'center' },
  counter: { alignSelf: 'flex-end', fontSize: theme.fontSize.xs, color: theme.colors.textSecondary, marginTop: -theme.spacing.sm },
  saveBtn: { marginTop: theme.spacing.md },
});
