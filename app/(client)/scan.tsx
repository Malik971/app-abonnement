import { useQueryClient } from '@tanstack/react-query';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useCallback, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { theme } from '@/constants/theme';
import { usePoints } from '@/hooks/usePoints';
import { useClientStore } from '@/stores/clientStore';
import type { ScanResult } from '@/types';

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const { processScan } = usePoints();
  const client = useClientStore((s) => s.client);
  const queryClient = useQueryClient();

  const [result, setResult] = useState<ScanResult | null>(null);
  const [busy, setBusy] = useState(false);
  // Anti-rebond : évite de traiter le même QR 10x en une seconde.
  const lockedRef = useRef(false);

  const onScan = useCallback(
    async ({ data }: { data: string }) => {
      if (lockedRef.current || busy) return;
      lockedRef.current = true;
      setBusy(true);

      const res = await processScan(data);
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

  function reset() {
    setResult(null);
    lockedRef.current = false;
  }

  // ── Permissions ─────────────────────────────────────────────────────────────
  if (!permission) {
    return <View style={styles.black} />;
  }
  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permission}>
        <Text style={styles.permTitle}>Caméra nécessaire</Text>
        <Text style={styles.permText}>
          Autorise la caméra pour scanner le QR code en caisse.
        </Text>
        <Button label="Autoriser la caméra" onPress={requestPermission} />
      </SafeAreaView>
    );
  }

  // ── Caméra ──────────────────────────────────────────────────────────────────
  return (
    <View style={styles.black}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={result ? undefined : onScan}
      />

      {/* Cadre de scan centré */}
      <View style={styles.overlay} pointerEvents="none">
        <View style={styles.frame} />
        <Text style={styles.hint}>Place le QR code dans le cadre</Text>
      </View>

      {/* Résultat */}
      {result ? (
        <SafeAreaView style={styles.resultWrap} edges={['bottom']}>
          <View style={[styles.resultCard, !result.ok && styles.resultCardError]}>
            {result.offline ? (
              <>
                <Text style={styles.resultEmoji}>📶</Text>
                <Text style={styles.resultTitle}>Passage enregistré</Text>
                <Text style={styles.resultText}>{result.message}</Text>
              </>
            ) : result.ok ? (
              <>
                <Text style={styles.resultEmoji}>✅</Text>
                <Text style={styles.resultTitle}>+{result.points_earned} point{(result.points_earned ?? 0) > 1 ? 's' : ''} !</Text>
                <Text style={styles.resultText}>
                  {result.business_name} · {result.new_total} points au total
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.resultEmoji}>⚠️</Text>
                <Text style={styles.resultTitle}>Scan impossible</Text>
                <Text style={styles.resultText}>{result.message}</Text>
              </>
            )}
            <Button label="Scanner à nouveau" onPress={reset} style={styles.resultBtn} />
          </View>
        </SafeAreaView>
      ) : null}
    </View>
  );
}

const FRAME = 250;

const styles = StyleSheet.create({
  black: { flex: 1, backgroundColor: '#000' },
  permission: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  permTitle: { fontSize: theme.fontSize.xl, fontWeight: '800', color: theme.colors.text },
  permText: { fontSize: theme.fontSize.md, color: theme.colors.textSecondary, textAlign: 'center' },
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
  resultWrap: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: theme.spacing.md },
  resultCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  resultCardError: { backgroundColor: '#FEF2F2' },
  resultEmoji: { fontSize: 40 },
  resultTitle: { fontSize: theme.fontSize.xl, fontWeight: '800', color: theme.colors.text },
  resultText: { fontSize: theme.fontSize.md, color: theme.colors.textSecondary, textAlign: 'center' },
  resultBtn: { alignSelf: 'stretch', marginTop: theme.spacing.md },
});
