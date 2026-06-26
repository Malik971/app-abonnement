import { useState } from 'react';
import { Modal, Share, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { theme } from '@/constants/theme';

interface MerchantQrCardProps {
  token: string;
  businessName: string;
}

/**
 * Aperçu miniature du QR code + modal plein écran avec partage.
 * Réutilisable (dashboard, réglages…).
 */
export function MerchantQrCard({ token, businessName }: MerchantQrCardProps) {
  const [open, setOpen] = useState(false);

  async function share() {
    await Share.share({
      message: `Scanne ce code chez ${businessName} pour cumuler des points ! Code : ${token}`,
    });
  }

  return (
    <>
      <Card style={styles.card}>
        <View style={styles.miniWrap}>
          <QRCode value={token} size={80} backgroundColor="white" />
        </View>
        <View style={styles.info}>
          <Text style={styles.title}>Mon QR code</Text>
          <Text style={styles.subtitle}>Affiche ce code en caisse</Text>
          <Button
            label="Voir en grand / Partager"
            variant="secondary"
            onPress={() => setOpen(true)}
            style={styles.cta}
          />
        </View>
      </Card>

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalContent}>
            <View style={styles.bigWrap}>
              <QRCode value={token} size={250} backgroundColor="white" />
            </View>
            <Text style={styles.modalName}>{businessName}</Text>
            <Text style={styles.modalHint}>Les clients scannent ce code pour cumuler leurs points.</Text>
          </View>
          <View style={styles.modalActions}>
            <Button label="Partager" onPress={share} />
            <Button label="Fermer" variant="ghost" onPress={() => setOpen(false)} />
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  miniWrap: { padding: theme.spacing.xs, backgroundColor: '#fff', borderRadius: theme.radius.sm },
  info: { flex: 1 },
  title: { fontSize: theme.fontSize.lg, fontWeight: '800', color: theme.colors.text },
  subtitle: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, marginBottom: theme.spacing.sm },
  cta: { height: 44 },
  modal: { flex: 1, backgroundColor: theme.colors.surface, justifyContent: 'space-between' },
  modalContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.lg, gap: theme.spacing.md },
  bigWrap: { padding: theme.spacing.lg, backgroundColor: '#fff', borderRadius: theme.radius.lg },
  modalName: { fontSize: theme.fontSize.xxl, fontWeight: '800', color: theme.colors.text, textAlign: 'center' },
  modalHint: { fontSize: theme.fontSize.md, color: theme.colors.textSecondary, textAlign: 'center' },
  modalActions: { padding: theme.spacing.lg, gap: theme.spacing.sm },
});
