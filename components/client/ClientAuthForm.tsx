import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { theme } from '@/constants/theme';
import { startEmailOtp, verifyEmailOtp } from '@/hooks/useAuth';
import { saveConsent } from '@/lib/consent';
import { useAuthStore } from '@/stores/authStore';
import { useGuestStore } from '@/stores/guestStore';

type Mode = 'signup' | 'login';

interface ClientAuthFormProps {
  /** Mode initial : créer un compte ou se connecter. Défaut : signup. */
  initialMode?: Mode;
  /** Appelé après une connexion réussie (la redirection est gérée par la garde). */
  onSuccess?: () => void;
}

/**
 * Inscription OU connexion client par OTP email (code à 6 chiffres).
 *  - Créer un compte : prénom + email + consentement RGPD.
 *  - Se connecter     : email seul (le compte existe déjà).
 * Le même code OTP sert aux deux ; un toggle permet de basculer.
 */
export function ClientAuthForm({ initialMode = 'signup', onSuccess }: ClientAuthFormProps) {
  const setConsent = useAuthStore((s) => s.setConsent);
  const leaveGuest = useGuestStore((s) => s.leaveGuest);

  const [mode, setMode] = useState<Mode>(initialMode);
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [consent, setConsentChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSignup = mode === 'signup';

  function switchMode(next: Mode) {
    setMode(next);
    setStep('email');
    setError(null);
  }

  async function sendCode() {
    setLoading(true);
    setError(null);
    const { error } = await startEmailOtp(email);
    setLoading(false);
    if (error) {
      // Message simple pour le client en production ; détail technique en dev.
      setError(
        __DEV__
          ? "Envoi du code impossible. (DEV) En test, Resend n'envoie qu'à l'adresse autorisée du compte ; vérifie aussi la config d'envoi d'emails Supabase."
          : "Nous n'avons pas pu envoyer ton code pour le moment. Vérifie ton adresse email et réessaie dans un instant.",
      );
      return;
    }
    setStep('code');
  }

  async function verify() {
    setLoading(true);
    setError(null);
    // En connexion, on n'envoie pas de prénom (on n'écrase pas l'existant).
    const { error } = await verifyEmailOtp(email, code, isSignup ? firstName : '');
    if (error) {
      setLoading(false);
      setError('Code invalide ou expiré. Réessaie.');
      return;
    }
    // Le compte existe = consentement déjà donné à l'inscription.
    await saveConsent(true);
    setConsent(true);
    await leaveGuest();
    setLoading(false);
    onSuccess?.();
  }

  const Toggle = (
    <View style={styles.toggle}>
      {(['signup', 'login'] as const).map((m) => (
        <Text
          key={m}
          onPress={() => switchMode(m)}
          style={[styles.toggleItem, mode === m && styles.toggleItemActive]}
        >
          {m === 'signup' ? 'Créer un compte' : 'Se connecter'}
        </Text>
      ))}
    </View>
  );

  if (step === 'code') {
    return (
      <View style={styles.container}>
        <Text style={styles.hint}>Code envoyé à {email}. Saisis les 6 chiffres reçus par email.</Text>
        <Input
          label="Code reçu par email"
          placeholder="123456"
          keyboardType="number-pad"
          value={code}
          onChangeText={setCode}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button
          label={isSignup ? 'Valider mon compte' : 'Se connecter'}
          onPress={verify}
          loading={loading}
          disabled={code.length < 6}
        />
        <Button label="Changer d'email" variant="ghost" onPress={() => setStep('email')} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {Toggle}

      {isSignup ? (
        <Input label="Prénom" placeholder="Ton prénom" value={firstName} onChangeText={setFirstName} />
      ) : null}

      <Input
        label="Email"
        placeholder="tonemail@exemple.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        value={email}
        onChangeText={setEmail}
      />

      {isSignup ? (
        <Pressable
          style={styles.consentRow}
          onPress={() => setConsentChecked((v) => !v)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: consent }}
        >
          <Ionicons
            name={consent ? 'checkbox' : 'square-outline'}
            size={22}
            color={consent ? theme.colors.primary : theme.colors.locked}
          />
          <Text style={styles.consentText}>
            J'accepte le traitement de mes données pour gérer mes cartes de fidélité (RGPD).
          </Text>
        </Pressable>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button
        label="Recevoir le code"
        onPress={sendCode}
        loading={loading}
        disabled={isSignup ? !firstName.trim() || !email.trim() || !consent : !email.trim()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: theme.spacing.xs },
  toggle: {
    flexDirection: 'row',
    backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.radius.md,
    padding: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  toggleItem: {
    flex: 1,
    textAlign: 'center',
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    color: theme.colors.primary,
    fontFamily: theme.fonts.title,
    fontSize: theme.fontSize.sm,
    overflow: 'hidden',
  },
  toggleItemActive: { backgroundColor: theme.colors.surface, color: theme.colors.text },
  hint: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, marginBottom: theme.spacing.sm },
  consentRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, paddingVertical: theme.spacing.sm },
  consentText: { flex: 1, fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, lineHeight: 18 },
  error: { color: theme.colors.danger, fontSize: theme.fontSize.sm, marginBottom: theme.spacing.xs },
});
