import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Alert, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { UpgradeCard } from '@/components/merchant/UpgradeCard';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { canSendPush } from '@/constants/plans';
import { theme } from '@/constants/theme';
import { fetchMerchantClients } from '@/lib/queries';
import { supabase } from '@/lib/supabase';
import { useMerchantStore } from '@/stores/merchantStore';

const MAX_CHARS = 200;

export default function NotificationsScreen() {
  const merchant = useMerchantStore((s) => s.merchant);
  const plan = merchant?.plan ?? 'starter';
  const unlocked = canSendPush(plan);

  const [message, setMessage] = useState('');
  const [inactiveOnly, setInactiveOnly] = useState(false);
  const [sending, setSending] = useState(false);

  const { data: clients = [] } = useQuery({
    queryKey: ['merchant-clients', merchant?.id],
    queryFn: () => fetchMerchantClients(merchant!.id),
    enabled: Boolean(merchant?.id),
  });

  const inactiveCount = useMemo(() => clients.filter((c) => c.is_inactive).length, [clients]);
  const recipients = inactiveOnly ? inactiveCount : clients.length;

  async function send() {
    if (!merchant) return;
    setSending(true);
    // L'envoi réel se fait côté serveur (edge function), jamais depuis l'app.
    const { error } = await supabase.functions.invoke('send-notification', {
      body: { merchantId: merchant.id, message, target: inactiveOnly ? 'inactive' : 'all' },
    });
    setSending(false);
    if (error) {
      Alert.alert('Envoi', "L'envoi a échoué. Réessaie plus tard.");
    } else {
      Alert.alert('Envoyé', `Notification envoyée à ${recipients} client${recipients > 1 ? 's' : ''}.`);
      setMessage('');
    }
  }

  // ── MUR 2 : version verrouillée (Starter) ──────────────────────────────────
  if (!unlocked) {
    return (
      <Screen scroll>
        <Text style={styles.title}>Notifications</Text>

        <Card style={styles.lockedPreview}>
          <Text style={styles.alertText}>
            {inactiveCount} client{inactiveCount > 1 ? 's' : ''} ne {inactiveCount > 1 ? 'sont' : "s'est"} pas
            revenu{inactiveCount > 1 ? 's' : ''} depuis 3 semaines.
          </Text>
          <View style={styles.fakeInput}>
            <Text style={styles.fakeInputText}>Ex : « -20% ce week-end pour nos fidèles ! »</Text>
          </View>
          <Button label="Envoyer à tous mes clients" disabled onPress={() => {}} />
        </Card>

        {merchant ? (
          <UpgradeCard
            merchantId={merchant.id}
            currentPlan={plan}
            ctaLabel="Débloquer les notifications — Passer en Pro"
          />
        ) : null}
      </Screen>
    );
  }

  // ── Version débloquée (Pro/Premium) ────────────────────────────────────────
  return (
    <Screen scroll>
      <Text style={styles.title}>Notifications</Text>

      <Card style={styles.composer}>
        <Text style={styles.label}>Message</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Écris ton message (200 caractères max)"
          placeholderTextColor={theme.colors.textSecondary}
          value={message}
          onChangeText={(t) => setMessage(t.slice(0, MAX_CHARS))}
          multiline
          maxLength={MAX_CHARS}
        />
        <Text style={styles.counter}>{message.length}/{MAX_CHARS}</Text>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Envoyer uniquement aux clients inactifs</Text>
          <Switch value={inactiveOnly} onValueChange={setInactiveOnly} />
        </View>

        <Text style={styles.recipients}>
          Destinataires : {recipients} client{recipients > 1 ? 's' : ''}
        </Text>

        <Button
          label="Envoyer"
          onPress={send}
          loading={sending}
          disabled={message.trim().length === 0 || recipients === 0}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: theme.fontSize.xxl, fontWeight: '800', color: theme.colors.text, marginBottom: theme.spacing.md, marginTop: theme.spacing.sm },
  lockedPreview: { gap: theme.spacing.md, marginBottom: theme.spacing.md },
  alertText: { fontSize: theme.fontSize.md, color: theme.colors.warning, fontWeight: '600' },
  fakeInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background,
  },
  fakeInputText: { color: theme.colors.textSecondary, fontSize: theme.fontSize.md },
  composer: { gap: theme.spacing.sm },
  label: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, fontWeight: '600' },
  textArea: {
    minHeight: 100,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    textAlignVertical: 'top',
  },
  counter: { alignSelf: 'flex-end', fontSize: theme.fontSize.xs, color: theme.colors.textSecondary },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: theme.spacing.sm },
  switchLabel: { flex: 1, fontSize: theme.fontSize.md, color: theme.colors.text, marginRight: theme.spacing.sm },
  recipients: { fontSize: theme.fontSize.md, color: theme.colors.primary, fontWeight: '700', marginVertical: theme.spacing.sm },
});
