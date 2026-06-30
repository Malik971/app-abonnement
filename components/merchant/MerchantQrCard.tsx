import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, Share, StyleSheet, Text, View } from 'react-native';
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
 * Aperçu du QR code. Tout le bloc est cliquable (pas seulement un bouton) :
 * un tap ouvre une modal plein écran avec le QR agrandi et le partage.
 */
export function MerchantQrCard({ token, businessName }: MerchantQrCardProps) {
  const [open, setOpen] = useState(false);

  async function share() {
    await Share.share({
      message: `Scanne ce code chez ${businessName} pour cumuler tes passages ! Code : ${token}`,
    });
  }

  return (
    <>
      <Pressable onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel="Voir mon QR code en grand">
        <Card style={styles.card}>
          <View style={styles.miniWrap}>
            <QRCode value={token} size={80} backgroundColor="white" />
          </View>
          <View style={styles.info}>
            <Text style={styles.title}>Mon QR code</Text>
            <Text style={styles.subtitle}>Affiche ce code en caisse</Text>
            <View style={styles.hintRow}>
              <Ionicons name="expand-outline" size={16} color={theme.colors.primary} />
              <Text style={styles.hint}>Toucher pour agrandir et partager</Text>
            </View>
          </View>
        </Card>
      </Pressable>

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalContent}>
            <View style={styles.bigWrap}>
              <QRCode value={token} size={250} backgroundColor="white" />
            </View>
            <Text style={styles.modalName}>{businessName}</Text>
            <Text style={styles.modalHint}>Les clients scannent ce code pour cumuler leurs passages.</Text>
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
  hintRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
  hint: { fontSize: theme.fontSize.sm, color: theme.colors.primary, fontFamily: theme.fonts.title },
  modal: { flex: 1, backgroundColor: theme.colors.surface, justifyContent: 'space-between' },
  modalContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.lg, gap: theme.spacing.md },
  bigWrap: { padding: theme.spacing.lg, backgroundColor: '#fff', borderRadius: theme.radius.lg },
  modalName: { fontSize: theme.fontSize.xxl, fontWeight: '800', color: theme.colors.text, textAlign: 'center' },
  modalHint: { fontSize: theme.fontSize.md, color: theme.colors.textSecondary, textAlign: 'center' },
  modalActions: { padding: theme.spacing.lg, gap: theme.spacing.sm },
});
