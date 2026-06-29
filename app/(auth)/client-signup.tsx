import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ClientAuthForm } from '@/components/client/ClientAuthForm';
import { BrandWordmark } from '@/components/ui/BrandWordmark';
import { Screen } from '@/components/ui/Screen';
import { theme } from '@/constants/theme';
import { ROUTES } from '@/lib/routes';

/**
 * Inscription / connexion client en plein écran (version route de l'AuthSheet).
 * Même formulaire OTP + consentement. La redirection après succès est gérée par
 * la garde racine.
 */
export default function ClientSignupScreen() {
  const router = useRouter();

  return (
    <Screen scroll>
      <BrandWordmark />
      <View style={styles.header}>
        <Text style={styles.title}>Créer mon compte</Text>
        <Text style={styles.subtitle}>Prénom + email, et tu reçois un code. C'est tout.</Text>
      </View>

      <ClientAuthForm onSuccess={() => router.replace(ROUTES.clientHome)} />

      <Pressable onPress={() => router.push(ROUTES.merchantLogin)} hitSlop={8} style={styles.merchantLink}>
        <Text style={styles.merchantText}>Je suis commerçant</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { marginTop: theme.spacing.md, marginBottom: theme.spacing.lg },
  title: { fontSize: theme.fontSize.display, fontFamily: theme.fonts.titleBold, color: theme.colors.text },
  subtitle: { fontSize: theme.fontSize.lg, color: theme.colors.textSecondary, marginTop: theme.spacing.xs },
  merchantLink: { alignSelf: 'center', paddingVertical: theme.spacing.md, marginTop: theme.spacing.lg },
  merchantText: {
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.mono,
    fontSize: theme.fontSize.sm,
    textDecorationLine: 'underline',
  },
});
