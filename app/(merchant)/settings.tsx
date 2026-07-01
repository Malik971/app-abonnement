import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Alert, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { UpgradeCard } from '@/components/merchant/UpgradeCard';
import { BugReportSheet } from '@/components/ui/BugReportSheet';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { PLANS, isInTrial, trialDaysLeft } from '@/constants/plans';
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
  const [address, setAddress] = useState('');
  const [website, setWebsite] = useState('');
  const [description, setDescription] = useState('');
  const [goalClients, setGoalClients] = useState('50');
  const [goalDaily, setGoalDaily] = useState('10');
  const [pointsPerVisit, setPointsPerVisit] = useState('1');
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [newPoints, setNewPoints] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [saving, setSaving] = useState(false);
  const [bugOpen, setBugOpen] = useState(false);

  useEffect(() => {
    if (merchant) {
      setBusinessName(merchant.business_name);
      setBusinessType(merchant.business_type ?? '');
      setAddress(merchant.address ?? '');
      setWebsite(merchant.website ?? '');
      setDescription(merchant.description ?? '');
      setGoalClients(String(merchant.goal_clients ?? 50));
      setGoalDaily(String(merchant.goal_daily_scans ?? 10));
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

    // La couleur de carte se règle dans l'écran dédié "Ma carte" ; ici on gère
    // l'identité du commerce et ses objectifs.
    await supabase
      .from('merchants')
      .update({
        business_name: businessName.trim(),
        business_type: businessType.trim() || null,
        address: address.trim() || null,
        website: website.trim() || null,
        description: description.trim() || null,
        goal_clients: Math.max(1, parseInt(goalClients, 10) || 50),
        goal_daily_scans: Math.max(1, parseInt(goalDaily, 10) || 10),
      })
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
      message: `Scanne ce code chez ${businessName} pour cumuler tes passages ! Code : ${program.qr_code_token}`,
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
        <Input label="Adresse" value={address} onChangeText={setAddress} placeholder="Ex : 12 rue Frébault, Pointe-à-Pitre" />
        <Input
          label="Site web ou lien Google Maps (optionnel)"
          value={website}
          onChangeText={setWebsite}
          placeholder="https://..."
          autoCapitalize="none"
          keyboardType="url"
        />
        <Input
          label="Description (optionnel)"
          value={description}
          onChangeText={setDescription}
          placeholder="Ex : Snack créole, bokit et jus frais le midi."
          multiline
          style={styles.descInput}
        />
      </Section>

      {/* Objectifs */}
      <Section title="Mes objectifs">
        <Text style={styles.muted}>Servent à afficher tes anneaux de progression sur le tableau de bord.</Text>
        <Input label="Objectif clients actifs" value={goalClients} onChangeText={setGoalClients} keyboardType="number-pad" />
        <Input label="Objectif passages par jour" value={goalDaily} onChangeText={setGoalDaily} keyboardType="number-pad" />
      </Section>

      {/* Programme de fidélité */}
      <Section title="Programme de fidélité">
        <Input
          label="Tampons par passage"
          value={pointsPerVisit}
          onChangeText={setPointsPerVisit}
          keyboardType="number-pad"
        />
        <Text style={styles.label}>Récompenses</Text>
        {rewards.length === 0 ? <Text style={styles.muted}>Aucune récompense configurée.</Text> : null}
        {rewards.map((r, i) => (
          <View key={`${r.label}-${i}`} style={styles.rewardRow}>
            <Text style={styles.rewardText}>
              {r.points_required} passages : {r.label}
            </Text>
            <Pressable onPress={() => removeReward(i)} hitSlop={8}>
              <Text style={styles.remove}>Supprimer</Text>
            </Pressable>
          </View>
        ))}
        <View style={styles.addRow}>
          <View style={styles.addPoints}>
            <Input placeholder="Nb" value={newPoints} onChangeText={setNewPoints} keyboardType="number-pad" />
          </View>
          <View style={styles.addLabel}>
            <Input placeholder="Récompense (ex : Café offert)" value={newLabel} onChangeText={setNewLabel} />
          </View>
        </View>
        <Button label="Ajouter la récompense" variant="secondary" onPress={addReward} />
        <Text style={styles.muted}>La couleur et la carte se personnalisent depuis « Ma carte » sur le tableau de bord.</Text>
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
        {merchant && isInTrial(merchant) ? (
          <Text style={styles.muted}>
            Essai Pro gratuit en cours : {trialDaysLeft(merchant)} jours restants. Sans abonnement,
            tu repasseras en Starter à la fin de l'essai.
          </Text>
        ) : null}
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

      <Button label="Signaler un problème" variant="ghost" onPress={() => setBugOpen(true)} />

      <Text style={styles.legal}>Vos données sont hébergées en Europe. Vous pouvez les supprimer à tout moment.</Text>

      <Button label="Se déconnecter" variant="ghost" onPress={() => void signOutUser()} style={styles.saveBtn} />

      <BugReportSheet visible={bugOpen} onClose={() => setBugOpen(false)} />
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
  title: { fontSize: theme.fontSize.xxl, fontFamily: theme.fonts.titleBold, color: theme.colors.text, marginTop: theme.spacing.sm, marginBottom: theme.spacing.md },
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
  descInput: { height: 88, paddingTop: theme.spacing.sm, textAlignVertical: 'top' },
  saveBtn: { marginBottom: theme.spacing.lg },
  qrWrap: { alignItems: 'center', paddingVertical: theme.spacing.md },
  qrHint: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, textAlign: 'center', marginBottom: theme.spacing.sm },
  planRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  planName: { fontSize: theme.fontSize.lg, fontWeight: '700', color: theme.colors.text },
  planPrice: { fontSize: theme.fontSize.md, color: theme.colors.primary, fontWeight: '700' },
  upgradeWrap: { marginTop: theme.spacing.sm },
  legal: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, marginBottom: theme.spacing.md },
});
