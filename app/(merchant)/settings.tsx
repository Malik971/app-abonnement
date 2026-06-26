import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Alert, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { UpgradeCard } from '@/components/merchant/UpgradeCard';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { PLANS } from '@/constants/plans';
import { theme } from '@/constants/theme';
import { signOutUser } from '@/hooks/useAuth';
import { openBillingPortal } from '@/lib/stripe';
import { supabase } from '@/lib/supabase';
import { useMerchantStore } from '@/stores/merchantStore';
import type { Reward } from '@/types';

export default function SettingsScreen() {
  const merchant = useMerchantStore((s) => s.merchant);
  const program = useMerchantStore((s) => s.program);
  const setProgram = useMerchantStore((s) => s.setProgram);
  const queryClient = useQueryClient();

  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [pointsPerVisit, setPointsPerVisit] = useState('1');
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [newPoints, setNewPoints] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (merchant) {
      setBusinessName(merchant.business_name);
      setBusinessType(merchant.business_type ?? '');
    }
  }, [merchant]);

  useEffect(() => {
    if (program) {
      setPointsPerVisit(String(program.points_per_visit));
      setRewards(program.rewards);
    }
  }, [program]);

  function addReward() {
    const pts = parseInt(newPoints, 10);
    if (!pts || pts <= 0 || !newLabel.trim()) return;
    setRewards((r) => [...r, { points_required: pts, label: newLabel.trim() }]);
    setNewPoints('');
    setNewLabel('');
  }

  function removeReward(index: number) {
    setRewards((r) => r.filter((_, i) => i !== index));
  }

  async function save() {
    if (!merchant || !program) return;
    setSaving(true);

    await supabase
      .from('merchants')
      .update({ business_name: businessName.trim(), business_type: businessType.trim() || null })
      .eq('id', merchant.id);

    const ppv = Math.max(1, parseInt(pointsPerVisit, 10) || 1);
    const { data: updatedProgram } = await supabase
      .from('loyalty_programs')
      .update({ points_per_visit: ppv, rewards })
      .eq('id', program.id)
      .select('*')
      .single();

    setSaving(false);
    if (updatedProgram) setProgram(updatedProgram);
    await queryClient.invalidateQueries({ queryKey: ['merchant', merchant.user_id] });
    Alert.alert('Enregistré', 'Tes réglages ont été mis à jour.');
  }

  async function shareQr() {
    if (!program) return;
    await Share.share({
      message: `Scanne ce code chez ${businessName} pour cumuler des points ! Code : ${program.qr_code_token}`,
    });
  }

  async function manageSubscription() {
    if (!merchant) return;
    const res = await openBillingPortal(merchant.id);
    if (!res.ok) Alert.alert('Abonnement', res.error ?? 'Portail indisponible.');
  }

  const planDef = merchant ? PLANS[merchant.plan] : PLANS.starter;
  const renewal = merchant?.plan_expires_at
    ? new Date(merchant.plan_expires_at).toLocaleDateString('fr-FR')
    : null;

  return (
    <Screen scroll>
      <Text style={styles.title}>Réglages</Text>

      {/* Commerce */}
      <Section title="Mon commerce">
        <Input label="Nom du commerce" value={businessName} onChangeText={setBusinessName} />
        <Input label="Type d'activité" value={businessType} onChangeText={setBusinessType} placeholder="Ex : Restauration" />
      </Section>

      {/* Programme de fidélité */}
      <Section title="Programme de fidélité">
        <Input
          label="Points par passage"
          value={pointsPerVisit}
          onChangeText={setPointsPerVisit}
          keyboardType="number-pad"
        />
        <Text style={styles.label}>Récompenses</Text>
        {rewards.length === 0 ? <Text style={styles.muted}>Aucune récompense configurée.</Text> : null}
        {rewards.map((r, i) => (
          <View key={`${r.label}-${i}`} style={styles.rewardRow}>
            <Text style={styles.rewardText}>
              {r.points_required} pts → {r.label}
            </Text>
            <Pressable onPress={() => removeReward(i)} hitSlop={8}>
              <Text style={styles.remove}>Supprimer</Text>
            </Pressable>
          </View>
        ))}
        <View style={styles.addRow}>
          <View style={styles.addPoints}>
            <Input placeholder="Pts" value={newPoints} onChangeText={setNewPoints} keyboardType="number-pad" />
          </View>
          <View style={styles.addLabel}>
            <Input placeholder="Récompense (ex : Café offert)" value={newLabel} onChangeText={setNewLabel} />
          </View>
        </View>
        <Button label="Ajouter la récompense" variant="secondary" onPress={addReward} />
      </Section>

      <Button label="Enregistrer" onPress={save} loading={saving} style={styles.saveBtn} />

      {/* QR code */}
      <Section title="QR code du commerce">
        <View style={styles.qrWrap}>
          {program ? (
            <QRCode value={program.qr_code_token} size={220} backgroundColor="white" />
          ) : (
            <Text style={styles.muted}>QR indisponible.</Text>
          )}
        </View>
        <Text style={styles.qrHint}>Affiche ce code en caisse. Les clients le scannent pour cumuler.</Text>
        <Button label="Partager le QR code" variant="ghost" onPress={shareQr} />
      </Section>

      {/* Abonnement */}
      <Section title="Abonnement">
        <View style={styles.planRow}>
          <Text style={styles.planName}>Plan {planDef.label}</Text>
          <Text style={styles.planPrice}>{planDef.price_eur}€/mois</Text>
        </View>
        {renewal ? <Text style={styles.muted}>Renouvellement le {renewal}</Text> : null}
        {merchant && merchant.plan !== 'premium' ? (
          <View style={styles.upgradeWrap}>
            <UpgradeCard merchantId={merchant.id} currentPlan={merchant.plan} />
          </View>
        ) : null}
        {merchant && merchant.plan !== 'starter' ? (
          <Button label="Gérer mon abonnement" variant="ghost" onPress={manageSubscription} />
        ) : null}
      </Section>

      <Text style={styles.legal}>Vos données sont hébergées en Europe. Vous pouvez les supprimer à tout moment.</Text>

      <Button label="Se déconnecter" variant="ghost" onPress={() => void signOutUser()} style={styles.saveBtn} />
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Card style={styles.sectionCard}>{children}</Card>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: theme.fontSize.xxl, fontWeight: '800', color: theme.colors.text, marginTop: theme.spacing.sm, marginBottom: theme.spacing.md },
  section: { marginBottom: theme.spacing.md },
  sectionTitle: { fontSize: theme.fontSize.md, fontWeight: '700', color: theme.colors.text, marginBottom: theme.spacing.sm },
  sectionCard: { gap: theme.spacing.sm },
  label: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, fontWeight: '600', marginTop: theme.spacing.xs },
  muted: { color: theme.colors.textSecondary, fontSize: theme.fontSize.md },
  rewardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: theme.spacing.xs },
  rewardText: { fontSize: theme.fontSize.md, color: theme.colors.text, flex: 1 },
  remove: { color: theme.colors.danger, fontSize: theme.fontSize.sm, fontWeight: '600' },
  addRow: { flexDirection: 'row', gap: theme.spacing.sm },
  addPoints: { width: 80 },
  addLabel: { flex: 1 },
  saveBtn: { marginBottom: theme.spacing.lg },
  qrWrap: { alignItems: 'center', paddingVertical: theme.spacing.md },
  qrHint: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, textAlign: 'center', marginBottom: theme.spacing.sm },
  planRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  planName: { fontSize: theme.fontSize.lg, fontWeight: '700', color: theme.colors.text },
  planPrice: { fontSize: theme.fontSize.md, color: theme.colors.primary, fontWeight: '700' },
  upgradeWrap: { marginTop: theme.spacing.sm },
  legal: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, marginBottom: theme.spacing.md },
});
