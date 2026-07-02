import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { theme } from '@/constants/theme';

interface Step {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
}

// Bulles de premier lancement, dans l'ordre des éléments du tableau de bord.
const STEPS: Step[] = [
  {
    icon: 'people-outline',
    title: 'Clients actifs',
    body: 'Fixe ton objectif de clients actifs pour suivre ta progression.',
  },
  {
    icon: 'today-outline',
    title: 'Passages du jour',
    body: "Suis les passages d'aujourd'hui en temps réel.",
  },
  {
    icon: 'location-outline',
    title: 'Ton adresse',
    body: 'Ajoute ton adresse dans les réglages pour qu\'elle apparaisse sur ta carte et redirige tes clients vers Google Maps.',
  },
];

/**
 * Séquence de tooltips affichée au premier lancement du tableau de bord
 * commerçant. Chaque bulle avance avec « J'ai compris » ; à la fin, onDone().
 */
export function MerchantTour({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const current = STEPS[step]!;
  const isLast = step === STEPS.length - 1;

  function next() {
    if (isLast) onDone();
    else setStep((s) => s + 1);
  }

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onDone}>
      <View style={styles.overlay}>
        <View style={styles.bubble}>
          <View style={styles.iconWrap}>
            <Ionicons name={current.icon} size={28} color={theme.colors.primary} />
          </View>
          <Text style={styles.counter}>
            {step + 1} / {STEPS.length}
          </Text>
          <Text style={styles.title}>{current.title}</Text>
          <Text style={styles.body}>{current.body}</Text>
          <Button label={isLast ? 'Terminer' : "J'ai compris"} onPress={next} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  bubble: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
    width: '100%',
    alignItems: 'center',
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.xs,
  },
  counter: { fontFamily: theme.fonts.mono, fontSize: theme.fontSize.sm, color: theme.colors.textSecondary },
  title: { fontFamily: theme.fonts.titleBold, fontSize: theme.fontSize.xl, color: theme.colors.text, textAlign: 'center' },
  body: { fontSize: theme.fontSize.md, color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 21, marginBottom: theme.spacing.sm },
});
