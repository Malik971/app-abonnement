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

interface ClientAuthFormProps {
  /** Appelé après une connexion réussie (la redirection est gérée par la garde). */
  onSuccess?: () => void;
}

/**
 * Inscription / connexion client par OTP email (prénom + email + code 6 chiffres).
 * Le consentement RGPD est recueilli ici, juste avant l'envoi du code
 * (l'app reste explorable sans compte ; le consentement n'arrive qu'à ce moment).
 */
export function ClientAuthForm({ onSuccess }: ClientAuthFormProps) {
  const setConsent = useAuthStore((s) => s.setConsent);
  const leaveGuest = useGuestStore((s) => s.leaveGuest);

  const [step, setStep] = useState<'email' | 'code'>('email');
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [consent, setConsentChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendCode() {
    setLoading(true);
    setError(null);
    const { error } = await startEmailOtp(email);
    setLoading(false);
    if (error) {
      setError(
        "Envoi du code impossible. Vérifie ton email (et que l'envoi d'emails est activé côté Supabase).",
      );
      return;
    }
    setStep('code');
  }

  async function verify() {
    setLoading(true);
    setError(null);
    const { error } = await verifyEmailOtp(email, code, firstName);
    if (error) {
      setLoading(false);
      setError('Code invalide ou expiré. Réessaie.');
      return;
    }
    // Consentement accordé en même temps que la création du compte.
    await saveConsent(true);
    setConsent(true);
    await leaveGuest();
    setLoading(false);
    onSuccess?.();
  }

  if (step === 'code') {
    return (
      <View style={styles.container}>
        <Text style={styles.hint}>
          Code envoyé à {email}. Saisis les 6 chiffres reçus par email.
        </Text>
        <Input
          label="Code reçu par email"
          placeholder="123456"
          keyboardType="number-pad"
          value={code}
          onChangeText={setCode}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button label="Valider mon compte" onPress={verify} loading={loading} disabled={code.length < 6} />
        <Button label="Changer d'email" variant="ghost" onPress={() => setStep('email')} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Input label="Prénom" placeholder="Ton prénom" value={firstName} onChangeText={setFirstName} />
      <Input
        label="Email"
        placeholder="tonemail@exemple.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        value={email}
        onChangeText={setEmail}
      />

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

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button
        label="Recevoir le code"
        onPress={sendCode}
        loading={loading}
        disabled={!firstName.trim() || !email.trim() || !consent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: theme.spacing.xs },
  hint: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, marginBottom: theme.spacing.sm },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  consentText: { flex: 1, fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, lineHeight: 18 },
  error: { color: theme.colors.danger, fontSize: theme.fontSize.sm, marginBottom: theme.spacing.xs },
});
