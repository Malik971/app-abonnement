import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { theme } from '@/constants/theme';
import { saveConsent } from '@/lib/consent';
import { useAuthStore } from '@/stores/authStore';

/**
 * Écran de consentement au premier lancement (RGPD + obligations stores).
 * Le refus empêche l'utilisation de l'app (données nécessaires au service).
 */
export default function ConsentScreen() {
  const router = useRouter();
  const setConsent = useAuthStore((s) => s.setConsent);
  const [refused, setRefused] = useState(false);

  async function accept() {
    await saveConsent(true);
    setConsent(true);
    router.replace('/(auth)/login');
  }

  function refuse() {
    setRefused(true);
  }

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Text style={styles.title}>Bienvenue 👋</Text>
        <Text style={styles.subtitle}>
          Cumule des points chez tes commerces préférés en Guadeloupe.
        </Text>
      </View>

      <View style={styles.block}>
        <Text style={styles.blockTitle}>Pour fonctionner, l'app utilise :</Text>
        <Bullet text="Ton prénom, pour personnaliser ton accueil." />
        <Bullet text="Ton numéro de téléphone, pour créer ton compte." />
        <Bullet text="Les notifications, pour te prévenir de tes récompenses." />
      </View>

      <Text style={styles.legal}>
        Tes données sont hébergées en Europe. Tu peux les supprimer à tout moment depuis ton profil.
      </Text>

      {refused ? (
        <Text style={styles.refused}>
          Ces données sont nécessaires au service. Sans ton accord, l'app ne peut pas
          fonctionner.
        </Text>
      ) : null}

      <View style={styles.actions}>
        <Button label="Accepter et continuer" onPress={accept} />
        <Button label="Refuser" variant="ghost" onPress={refuse} />
      </View>
    </Screen>
  );
}

function Bullet({ text }: { text: string }) {
  return (
    <View style={styles.bullet}>
      <Text style={styles.bulletDot}>•</Text>
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { marginTop: theme.spacing.xl, marginBottom: theme.spacing.xl },
  title: { fontSize: theme.fontSize.display, fontWeight: '800', color: theme.colors.text },
  subtitle: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
  },
  block: { marginBottom: theme.spacing.lg },
  blockTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  bullet: { flexDirection: 'row', marginBottom: theme.spacing.sm, gap: theme.spacing.sm },
  bulletDot: { fontSize: theme.fontSize.lg, color: theme.colors.primary },
  bulletText: { flex: 1, fontSize: theme.fontSize.md, color: theme.colors.text },
  legal: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
  },
  refused: {
    fontSize: theme.fontSize.md,
    color: theme.colors.danger,
    marginBottom: theme.spacing.md,
    fontWeight: '600',
  },
  actions: { gap: theme.spacing.sm },
});
