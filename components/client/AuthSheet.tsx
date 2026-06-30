import { useRouter } from 'expo-router';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ClientAuthForm } from '@/components/client/ClientAuthForm';
import { theme } from '@/constants/theme';
import { ROUTES } from '@/lib/routes';
import { useGuestStore } from '@/stores/guestStore';

/**
 * Mur de création de compte, en bottom-sheet douce (slide depuis le bas).
 * Déclenché par `requireAuth(reason)` au moment d'une vraie action (enregistrer
 * une carte, rejoindre un commerce, réclamer une récompense). Pas de page sèche.
 *
 * Monté une fois dans le layout client → disponible sur tous les onglets.
 */
export function AuthSheet() {
  const visible = useGuestStore((s) => s.authSheetVisible);
  const reason = useGuestStore((s) => s.authReason);
  const mode = useGuestStore((s) => s.authMode);
  const close = useGuestStore((s) => s.closeAuthSheet);
  const router = useRouter();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropTouch} onPress={close} accessibilityLabel="Fermer" />

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
              <Text style={styles.title}>{mode === 'login' ? 'Bon retour' : 'Crée ton compte'}</Text>
              <Text style={styles.subtitle}>
                {mode === 'login'
                  ? 'Connecte-toi avec ton email pour retrouver tes cartes.'
                  : reason
                    ? `Pour ${reason}, crée ton compte en quelques secondes.`
                    : 'Crée ton compte pour enregistrer tes vraies cartes de fidélité.'}
              </Text>

              <ClientAuthForm key={mode} initialMode={mode} onSuccess={close} />

              <Pressable
                onPress={() => {
                  close();
                  router.push(ROUTES.merchantLogin);
                }}
                hitSlop={8}
                style={styles.merchantLink}
              >
                <Text style={styles.merchantText}>Je suis commerçant</Text>
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  backdropTouch: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.xl,
    maxHeight: '88%',
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: theme.colors.border,
    marginBottom: theme.spacing.md,
  },
  content: { gap: theme.spacing.xs },
  title: { fontFamily: theme.fonts.titleBold, fontSize: theme.fontSize.xxl, color: theme.colors.text },
  subtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
    lineHeight: 21,
  },
  merchantLink: { alignSelf: 'center', paddingVertical: theme.spacing.md, marginTop: theme.spacing.sm },
  merchantText: {
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.mono,
    fontSize: theme.fontSize.sm,
    textDecorationLine: 'underline',
  },
});
