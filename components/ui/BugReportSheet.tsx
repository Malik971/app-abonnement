import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Button } from '@/components/ui/Button';
import { theme } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

interface BugReportSheetProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Bottom sheet « Signaler un problème ». L'envoi appelle l'edge function
 * report-issue qui route le message vers le support (rôle, email, user ID inclus
 * côté serveur). Tout se passe dans la sheet, sans quitter l'app.
 */
export function BugReportSheet({ visible, onClose }: BugReportSheetProps) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  function close() {
    setMessage('');
    setError(null);
    setSent(false);
    onClose();
  }

  async function send() {
    setSending(true);
    setError(null);
    const { data, error: fnError } = await supabase.functions.invoke('report-issue', {
      body: { message },
    });
    setSending(false);
    if (fnError || !data?.ok) {
      setError("L'envoi a échoué. Réessaie dans un instant.");
      return;
    }
    setSent(true);
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropTouch} onPress={close} accessibilityLabel="Fermer" />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            {sent ? (
              <View style={styles.done}>
                <Text style={styles.title}>Merci !</Text>
                <Text style={styles.subtitle}>Ton signalement a bien été envoyé à notre équipe.</Text>
                <Button label="Fermer" onPress={close} />
              </View>
            ) : (
              <>
                <Text style={styles.title}>Signaler un problème</Text>
                <Text style={styles.subtitle}>Décris ce qui ne va pas, on regarde ça au plus vite.</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Explique le problème rencontré..."
                  placeholderTextColor={theme.colors.textSecondary}
                  value={message}
                  onChangeText={setMessage}
                  multiline
                  maxLength={2000}
                />
                {error ? <Text style={styles.error}>{error}</Text> : null}
                <Button label="Envoyer" onPress={send} loading={sending} disabled={message.trim().length === 0} />
                <Button label="Annuler" variant="ghost" onPress={close} />
              </>
            )}
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
    gap: theme.spacing.sm,
  },
  handle: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: theme.colors.border, marginBottom: theme.spacing.sm },
  done: { gap: theme.spacing.md, alignItems: 'center', paddingVertical: theme.spacing.md },
  title: { fontFamily: theme.fonts.titleBold, fontSize: theme.fontSize.xl, color: theme.colors.text },
  subtitle: { fontSize: theme.fontSize.md, color: theme.colors.textSecondary, marginBottom: theme.spacing.xs },
  input: {
    minHeight: 110,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    textAlignVertical: 'top',
    backgroundColor: theme.colors.background,
  },
  error: { color: theme.colors.danger, fontSize: theme.fontSize.sm },
});
