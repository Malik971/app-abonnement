import { Link } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BrandWordmark } from '@/components/ui/BrandWordmark';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { theme } from '@/constants/theme';
import { signInClient, signInMerchant } from '@/hooks/useAuth';
import type { UserRole } from '@/types';

export default function LoginScreen() {
  const [role, setRole] = useState<UserRole>('client');

  return (
    <Screen scroll>
      <BrandWordmark />
      <View style={styles.header}>
        <Text style={styles.title}>Connexion</Text>
        <Text style={styles.subtitle}>Heureux de te revoir.</Text>
      </View>

      <RoleToggle role={role} onChange={setRole} />

      {role === 'client' ? <ClientLogin /> : <MerchantLogin />}

      <View style={styles.footer}>
        <Text style={styles.footerText}>Pas encore de compte ?</Text>
        <Link href="/(auth)/register" style={styles.link}>
          Créer un compte
        </Link>
      </View>
    </Screen>
  );
}

export function RoleToggle({
  role,
  onChange,
}: {
  role: UserRole;
  onChange: (r: UserRole) => void;
}) {
  return (
    <View style={styles.toggle}>
      {(['client', 'merchant'] as const).map((r) => (
        <Text
          key={r}
          onPress={() => onChange(r)}
          style={[styles.toggleItem, role === r && styles.toggleItemActive]}
        >
          {r === 'client' ? 'Je suis client' : 'Je suis commerçant'}
        </Text>
      ))}
    </View>
  );
}

function ClientLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setLoading(true);
    setError(null);
    const { error } = await signInClient(email, password);
    setLoading(false);
    if (error) setError(error);
    // Succès : la redirection est gérée par la garde du root layout.
  }

  return (
    <View>
      <Input
        label="Email"
        placeholder="prenom@email.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        value={email}
        onChangeText={setEmail}
      />
      <Input
        label="Mot de passe"
        placeholder="••••••••"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button
        label="Se connecter"
        onPress={submit}
        loading={loading}
        disabled={!email || !password}
      />
    </View>
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
      <Input
        label="Mot de passe"
        placeholder="••••••••"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button label="Se connecter" onPress={submit} loading={loading} disabled={!email || !password} />
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
  toggleItemActive: {
    backgroundColor: theme.colors.surface,
    color: theme.colors.text,
  },
  error: { color: theme.colors.danger, marginBottom: theme.spacing.md, fontSize: theme.fontSize.sm },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: theme.spacing.xl, gap: theme.spacing.xs },
  footerText: { color: theme.colors.textSecondary, fontSize: theme.fontSize.md },
  link: { color: theme.colors.primary, fontWeight: '700', fontSize: theme.fontSize.md },
});
