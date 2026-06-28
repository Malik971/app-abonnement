import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { theme } from '@/constants/theme';
import { signOutUser } from '@/hooks/useAuth';
import { fetchClientCards } from '@/lib/queries';
import { supabase } from '@/lib/supabase';
import { useClientStore } from '@/stores/clientStore';

export default function ProfileScreen() {
  const client = useClientStore((s) => s.client);
  const clearClient = useClientStore((s) => s.clear);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { data: cards = [] } = useQuery({
    queryKey: ['client-cards', client?.id],
    queryFn: () => fetchClientCards(client!.id),
    enabled: Boolean(client?.id),
  });

  async function deleteAccount() {
    if (!client?.id) return;
    setDeleting(true);
    // Anonymise les données personnelles + scans côté serveur (RGPD).
    const { error } = await supabase.rpc('delete_client_data', { p_client_id: client.id });
    setDeleting(false);
    if (error) {
      Alert.alert('Erreur', "La suppression a échoué. Réessaie plus tard.");
      return;
    }
    clearClient();
    await signOutUser();
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Mon profil</Text>

        <Card style={styles.section}>
          <Row label="Prénom" value={client?.first_name || '—'} />
          <Row label="Téléphone" value={client?.phone || '—'} />
        </Card>

        <Text style={styles.sectionTitle}>Mes commerces</Text>
        <Card style={styles.section}>
          {cards.length === 0 ? (
            <Text style={styles.muted}>Aucune carte pour l'instant.</Text>
          ) : (
            cards.map((c) => (
              <View key={c.id} style={styles.merchantRow}>
                <Text style={styles.merchantName}>{c.business_name}</Text>
                <Text style={styles.merchantPoints}>{c.points} pts</Text>
              </View>
            ))
          )}
        </Card>

        <Text style={styles.legal}>
          Vos données sont hébergées en Europe. Vous pouvez les supprimer à tout moment.
        </Text>

        <View style={styles.actions}>
          <Button label="Se déconnecter" variant="ghost" onPress={() => void signOutUser()} />
          <Button label="Supprimer mon compte" variant="danger" onPress={() => setConfirmOpen(true)} />
        </View>
      </ScrollView>

      <Modal visible={confirmOpen} transparent animationType="fade">
        <View style={styles.backdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Supprimer ton compte ?</Text>
            <Text style={styles.modalText}>
              Tes données personnelles (prénom, téléphone) seront effacées. Tes cartes de
              fidélité seront perdues. Cette action est irréversible.
            </Text>
            <Button label="Oui, supprimer" variant="danger" onPress={deleteAccount} loading={deleting} />
            <Button label="Annuler" variant="ghost" onPress={() => setConfirmOpen(false)} />
          </View>
        </View>
      </Modal>
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
  content: { padding: theme.spacing.md, gap: theme.spacing.md },
  title: { fontSize: theme.fontSize.xxl, fontFamily: theme.fonts.titleBold, color: theme.colors.text },
  section: { gap: theme.spacing.sm },
  sectionTitle: { fontSize: theme.fontSize.md, fontWeight: '700', color: theme.colors.text, marginTop: theme.spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  rowLabel: { fontSize: theme.fontSize.md, color: theme.colors.textSecondary },
  rowValue: { fontSize: theme.fontSize.md, color: theme.colors.text, fontWeight: '600' },
  merchantRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  merchantName: { fontSize: theme.fontSize.md, color: theme.colors.text },
  merchantPoints: { fontSize: theme.fontSize.md, color: theme.colors.primary, fontWeight: '700' },
  muted: { color: theme.colors.textSecondary, fontSize: theme.fontSize.md },
  legal: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, marginTop: theme.spacing.sm },
  actions: { gap: theme.spacing.sm, marginTop: theme.spacing.md },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: theme.spacing.lg },
  modalCard: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, padding: theme.spacing.xl, gap: theme.spacing.md, width: '100%' },
  modalTitle: { fontSize: theme.fontSize.xl, fontWeight: '800', color: theme.colors.text },
  modalText: { fontSize: theme.fontSize.md, color: theme.colors.textSecondary },
});
