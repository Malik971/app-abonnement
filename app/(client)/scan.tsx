import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { theme } from '@/constants/theme';
import { usePoints } from '@/hooks/usePoints';
import { useClientStore } from '@/stores/clientStore';
import type { ScanResult } from '@/types';

type Mode = 'camera' | 'manual';

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const { processScan } = usePoints();
  const client = useClientStore((s) => s.client);
  const queryClient = useQueryClient();

  const [mode, setMode] = useState<Mode>('camera');
  const [manualCode, setManualCode] = useState('');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [busy, setBusy] = useState(false);
  // Anti-rebond : évite de traiter le même QR 10x en une seconde.
  const lockedRef = useRef(false);

  const runScan = useCallback(
    async (code: string) => {
      const value = code.trim();
      if (!value || lockedRef.current || busy) return;
      lockedRef.current = true;
      setBusy(true);

      const res = await processScan(value);
      setResult(res);

      void Haptics.notificationAsync(
        res.ok
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Error,
      );

      if (res.ok && !res.offline) {
        await queryClient.invalidateQueries({ queryKey: ['client-cards', client?.id] });
      }
      setBusy(false);
    },
    [busy, processScan, queryClient, client?.id],
  );

  const onScan = useCallback(({ data }: { data: string }) => void runScan(data), [runScan]);

  function reset() {
    setResult(null);
    setManualCode('');
    lockedRef.current = false;
  }

  function switchMode(next: Mode) {
    reset();
    setMode(next);
  }

  const cameraMode = mode === 'camera';

  return (
    <View style={[styles.container, { backgroundColor: cameraMode ? '#000' : theme.colors.background }]}>
      {/* Zone principale : caméra ou saisie manuelle */}
      {cameraMode ? (
        !permission ? (
          <View style={styles.flex} />
        ) : !permission.granted ? (
          <View style={styles.centered}>
            <Text style={styles.permTitle}>Caméra nécessaire</Text>
            <Text style={styles.permText}>Autorise la caméra pour scanner le QR code en caisse.</Text>
            <Button label="Autoriser la caméra" onPress={requestPermission} />
            <Text style={styles.permHint}>… ou utilise « Code manuel » ci-dessous.</Text>
          </View>
        ) : (
          <View style={styles.flex}>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={result ? undefined : onScan}
            />
            <View style={styles.overlay} pointerEvents="none">
              <View style={styles.frame} />
              <Text style={styles.hint}>Place le QR code dans le cadre</Text>
            </View>
          </View>
        )
      ) : (
        <SafeAreaView style={styles.manualWrap} edges={['top']}>
          <Text style={styles.manualTitle}>Entre le code du commerce</Text>
          <TextInput
            style={styles.manualInput}
            placeholder="EX : A1B2C3D4"
            placeholderTextColor={theme.colors.textSecondary}
            value={manualCode}
            onChangeText={setManualCode}
            autoCapitalize="characters"
            autoCorrect={false}
            keyboardType="visible-password"
          />
          <Button
            label="Valider"
            onPress={() => void runScan(manualCode)}
            loading={busy}
            disabled={manualCode.trim().length === 0}
          />
          <Text style={styles.manualHint}>
            Le code figure sous le QR code affiché en caisse.
          </Text>
        </SafeAreaView>
      )}

      {/* Résultat */}
      {result ? (
        <View style={styles.resultWrap}>
          <View style={[styles.resultCard, !result.ok && styles.resultCardError]}>
            {result.offline ? (
              <>
                <Ionicons name="cloud-offline-outline" size={56} color={theme.colors.warning} />
                <Text style={styles.resultTitle}>Passage enregistré</Text>
                <Text style={styles.resultText}>{result.message}</Text>
              </>
            ) : result.ok ? (
              <>
                <Ionicons name="checkmark-circle" size={56} color={theme.colors.success} />
                <Text style={styles.resultTitle}>
                  +{result.points_earned} point{(result.points_earned ?? 0) > 1 ? 's' : ''} !
                </Text>
                <Text style={styles.resultText}>
                  {result.business_name} · {result.new_total} points au total
                </Text>
              </>
            ) : (
              <>
                <Ionicons name="alert-circle" size={56} color={theme.colors.danger} />
                <Text style={styles.resultTitle}>Scan impossible</Text>
                <Text style={styles.resultText}>{result.message}</Text>
              </>
            )}
            <Button label="Recommencer" onPress={reset} style={styles.resultBtn} />
          </View>
        </View>
      ) : null}

      {/* Onglets bas : Scanner / Code manuel */}
      <SafeAreaView style={styles.tabBar} edges={['bottom']}>
        <View style={styles.tabRow}>
          <ModeTab label="Scanner" active={cameraMode} onPress={() => switchMode('camera')} />
          <ModeTab label="Code manuel" active={!cameraMode} onPress={() => switchMode('manual')} />
        </View>
      </SafeAreaView>
    </View>
  );
}

function ModeTab({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.tab, active ? styles.tabActive : styles.tabInactive]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.tabLabel, active ? styles.tabLabelActive : styles.tabLabelInactive]}>{label}</Text>
    </Pressable>
  );
}

const FRAME = 250;

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    backgroundColor: theme.colors.background,
  },
  permTitle: { fontSize: theme.fontSize.xl, fontWeight: '800', color: theme.colors.text },
  permText: { fontSize: theme.fontSize.md, color: theme.colors.textSecondary, textAlign: 'center' },
  permHint: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary },
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  frame: {
    width: FRAME,
    height: FRAME,
    borderWidth: 3,
    borderColor: '#fff',
    borderRadius: theme.radius.lg,
    backgroundColor: 'transparent',
  },
  hint: {
    color: '#fff',
    fontSize: theme.fontSize.md,
    marginTop: theme.spacing.lg,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowRadius: 4,
  },
  // Saisie manuelle
  manualWrap: { flex: 1, padding: theme.spacing.lg, gap: theme.spacing.md, justifyContent: 'center' },
  manualTitle: { fontSize: theme.fontSize.xl, fontWeight: '800', color: theme.colors.text },
  manualInput: {
    height: 56,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    fontSize: theme.fontSize.xl,
    letterSpacing: 2,
    color: theme.colors.text,
    backgroundColor: theme.colors.surface,
  },
  manualHint: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary },
  // Résultat
  resultWrap: { position: 'absolute', left: 0, right: 0, bottom: 96, padding: theme.spacing.md },
  resultCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  resultCardError: { backgroundColor: '#FEF2F2' },
  resultTitle: { fontSize: theme.fontSize.xl, fontWeight: '800', color: theme.colors.text },
  resultText: { fontSize: theme.fontSize.md, color: theme.colors.textSecondary, textAlign: 'center' },
  resultBtn: { alignSelf: 'stretch', marginTop: theme.spacing.md },
  // Onglets
  tabBar: { backgroundColor: theme.colors.surface, borderTopWidth: 1, borderTopColor: theme.colors.border },
  tabRow: { flexDirection: 'row', gap: theme.spacing.sm, padding: theme.spacing.md },
  tab: {
    flex: 1,
    height: 48,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: { backgroundColor: theme.colors.primary },
  tabInactive: { borderWidth: 1.5, borderColor: theme.colors.primary, backgroundColor: 'transparent' },
  tabLabel: { fontSize: theme.fontSize.md, fontWeight: '700' },
  tabLabelActive: { color: '#fff' },
  tabLabelInactive: { color: theme.colors.primary },
});
