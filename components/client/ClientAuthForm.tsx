import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Input } from '@/components/ui/Input';
import { theme } from '@/constants/theme';
import { PASSWORD_MIN, signInClient, signUpClient } from '@/hooks/useAuth';
import { signInWithApple, signInWithFacebook, signInWithGoogle } from '@/hooks/useSocialAuth';
import { saveConsent } from '@/lib/consent';
import { useAuthStore } from '@/stores/authStore';
import { useGuestStore } from '@/stores/guestStore';

type Mode = 'signup' | 'login';
type Provider = 'apple' | 'google' | 'facebook';

interface ClientAuthFormProps {
  initialMode?: Mode;
  onSuccess?: () => void;
}

/**
 * Inscription / connexion client : email + mot de passe (8 caractères minimum)
 * ou connexion sociale (Apple, Google, Facebook). Charte Fidéli.
 */
export function ClientAuthForm({ initialMode = 'signup', onSuccess }: ClientAuthFormProps) {
  const setConsent = useAuthStore((s) => s.setConsent);
  const leaveGuest = useGuestStore((s) => s.leaveGuest);

  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [social, setSocial] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isSignup = mode === 'signup';
  const emailValid = email.trim().length > 3 && email.includes('@');
  const canSubmit = isSignup ? emailValid && password.length >= PASSWORD_MIN : emailValid && password.length > 0;
  const busy = loading || social !== null;

  // Consentement RGPD accordé au moment de la création / connexion du compte.
  async function afterSuccess() {
    await saveConsent(true);
    setConsent(true);
    await leaveGuest();
    setLoading(false);
    setSocial(null);
    onSuccess?.();
  }

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
  }

  async function submit() {
    if (isSignup && password.length < PASSWORD_MIN) {
      setError(`Le mot de passe doit contenir au moins ${PASSWORD_MIN} caractères.`);
      return;
    }
    setLoading(true);
    setError(null);
    const res = isSignup ? await signUpClient(email, password) : await signInClient(email, password);
    if (res.error) {
      setLoading(false);
      setError(
        isSignup
          ? 'Création impossible. Cet email est peut-être déjà utilisé.'
          : 'Email ou mot de passe incorrect.',
      );
      return;
    }
    await afterSuccess();
  }

  async function onSocial(provider: Provider) {
    setError(null);
    setSocial(provider);
    const fn =
      provider === 'apple' ? signInWithApple : provider === 'google' ? signInWithGoogle : signInWithFacebook;
    const res = await fn();
    if (res.ok) {
      await afterSuccess();
      return;
    }
    setSocial(null);
    if (res.error) setError(res.error);
  }

  return (
    <View style={styles.container}>
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

      <Input
        label="Mon adresse email"
        placeholder="prenom@email.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        value={email}
        onChangeText={setEmail}
      />
      <Input
        label={isSignup ? 'Créer un mot de passe' : 'Mot de passe'}
        placeholder={isSignup ? `${PASSWORD_MIN} caractères minimum` : '••••••••'}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable onPress={submit} disabled={!canSubmit || busy} style={styles.mainWrap}>
        <LinearGradient
          colors={[theme.colors.gradientStart, theme.colors.gradientMid, theme.colors.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.mainBtn, (!canSubmit || busy) && styles.mainBtnDisabled]}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.mainLabel}>{isSignup ? 'Créer mon compte' : 'Se connecter'}</Text>
          )}
        </LinearGradient>
      </Pressable>

      {isSignup ? (
        <Text style={styles.legal}>
          En créant un compte, tu acceptes le traitement de tes données pour gérer tes cartes de
          fidélité (voir Confidentialité).
        </Text>
      ) : null}

      {/* Séparateur */}
      <View style={styles.separator}>
        <View style={styles.line} />
        <Text style={styles.or}>Ou</Text>
        <View style={styles.line} />
      </View>

      {/* Boutons sociaux (cercles outline) */}
      <View style={styles.socials}>
        {Platform.OS === 'ios' ? (
          <SocialCircle icon="logo-apple" color={theme.colors.text} loading={social === 'apple'} onPress={() => onSocial('apple')} />
        ) : null}
        <SocialCircle icon="logo-google" color="#DB4437" loading={social === 'google'} onPress={() => onSocial('google')} />
        <SocialCircle icon="logo-facebook" color="#1877F2" loading={social === 'facebook'} onPress={() => onSocial('facebook')} />
      </View>
    </View>
  );
}

function SocialCircle({
  icon,
  color,
  loading,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  loading: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.circle} onPress={onPress} disabled={loading} accessibilityRole="button">
      {loading ? <ActivityIndicator color={theme.colors.text} /> : <Ionicons name={icon} size={26} color={color} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { gap: theme.spacing.sm },
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
  error: { color: theme.colors.danger, fontSize: theme.fontSize.sm },
  mainWrap: { marginTop: theme.spacing.xs },
  mainBtn: {
    height: 54,
    borderRadius: theme.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainBtnDisabled: { opacity: 0.5 },
  mainLabel: { color: '#FFFFFF', fontFamily: theme.fonts.titleBold, fontSize: theme.fontSize.lg },
  legal: { fontSize: theme.fontSize.xs, color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 16 },
  separator: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginVertical: theme.spacing.sm },
  line: { flex: 1, height: 1, backgroundColor: theme.colors.border },
  or: { fontFamily: theme.fonts.titleBold, fontSize: theme.fontSize.sm, color: theme.colors.textSecondary },
  socials: { flexDirection: 'row', justifyContent: 'center', gap: theme.spacing.lg },
  circle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
