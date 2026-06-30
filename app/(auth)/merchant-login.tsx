import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BrandWordmark } from '@/components/ui/BrandWordmark';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { theme } from '@/constants/theme';
import { signInMerchant, signUpMerchant } from '@/hooks/useAuth';
import { ROUTES } from '@/lib/routes';
import { supabase } from '@/lib/supabase';

type Mode = 'login' | 'signup';

/**
 * Espace COMMERÇANT, séparé du parcours client. Connexion email + mot de passe,
 * avec bascule vers la création de commerce. La redirection après succès est
 * gérée par la garde racine (rôle merchant → dashboard).
 */
export default function MerchantLoginScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('login');

  return (
    <Screen scroll>
      <BrandWordmark />
      <View style={styles.header}>
        <Text style={styles.title}>Espace commerçant</Text>
        <Text style={styles.subtitle}>
          {mode === 'login' ? 'Connecte-toi pour gérer ton commerce.' : 'Crée ton commerce en 1 minute.'}
        </Text>
      </View>

      <View style={styles.toggle}>
        {(['login', 'signup'] as const).map((m) => (
          <Text
            key={m}
            onPress={() => setMode(m)}
            style={[styles.toggleItem, mode === m && styles.toggleItemActive]}
          >
            {m === 'login' ? 'Connexion' : 'Créer mon commerce'}
          </Text>
        ))}
      </View>

      {mode === 'login' ? <MerchantLogin /> : <MerchantSignup />}

      <Pressable onPress={() => router.replace(ROUTES.clientHome)} hitSlop={8} style={styles.clientLink}>
        <Text style={styles.clientText}>Je suis client</Text>
      </Pressable>
    </Screen>
  );
}

function MerchantLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setLoading(true);
    setError(null);
    const { error } = await signInMerchant(email, password);
    setLoading(false);
    if (error) setError(error);
  }

  return (
    <View>
      <Input
        label="Email"
        placeholder="contact@moncommerce.gp"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        value={email}
        onChangeText={setEmail}
      />
      <Input label="Mot de passe" placeholder="••••••••" secureTextEntry value={password} onChangeText={setPassword} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button label="Se connecter" onPress={submit} loading={loading} disabled={!email || !password} />
    </View>
  );
}

function MerchantSignup() {
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit() {
    setLoading(true);
    setError(null);
    const { error } = await signUpMerchant({
      email,
      password,
      businessName,
      businessType: businessType || undefined,
    });
    setLoading(false);
    if (error) {
      setError(error);
      return;
    }
    // Prévient l'admin pour validation manuelle (best-effort, ne bloque pas).
    void supabase.functions.invoke('notify-merchant-signup', {}).catch(() => {});
    setDone(true);
  }

  if (done) {
    return (
      <Text style={styles.success}>
        Compte créé ! Ton dossier est en cours de vérification. Tu recevras un email dès
        l'activation (en général sous 24 à 48h).
      </Text>
    );
  }

  return (
    <View>
      <Input label="Nom du commerce" placeholder="Ex : Café Karukera" value={businessName} onChangeText={setBusinessName} />
      <Input label="Type d'activité (optionnel)" placeholder="Ex : Restauration" value={businessType} onChangeText={setBusinessType} />
      <Input
        label="Email"
        placeholder="contact@moncommerce.gp"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        value={email}
        onChangeText={setEmail}
      />
      <Input label="Mot de passe" placeholder="Au moins 6 caractères" secureTextEntry value={password} onChangeText={setPassword} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button
        label="Créer mon commerce"
        onPress={submit}
        loading={loading}
        disabled={!businessName || !email || password.length < 6}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { marginTop: theme.spacing.md, marginBottom: theme.spacing.lg },
  title: { fontSize: theme.fontSize.display, fontFamily: theme.fonts.titleBold, color: theme.colors.text },
  subtitle: { fontSize: theme.fontSize.lg, color: theme.colors.textSecondary, marginTop: theme.spacing.xs },
  toggle: {
    flexDirection: 'row',
    backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.radius.md,
    padding: theme.spacing.xs,
    marginBottom: theme.spacing.lg,
  },
  toggleItem: {
    flex: 1,
    textAlign: 'center',
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    color: theme.colors.primary,
    fontWeight: '600',
    fontSize: theme.fontSize.sm,
    overflow: 'hidden',
  },
  toggleItemActive: { backgroundColor: theme.colors.surface, color: theme.colors.text },
  error: { color: theme.colors.danger, marginBottom: theme.spacing.md, fontSize: theme.fontSize.sm },
  success: { color: theme.colors.success, fontSize: theme.fontSize.md, fontWeight: '600' },
  clientLink: { alignSelf: 'center', paddingVertical: theme.spacing.md, marginTop: theme.spacing.xl },
  clientText: {
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.mono,
    fontSize: theme.fontSize.sm,
    textDecorationLine: 'underline',
  },
});
