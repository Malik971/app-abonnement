import { Link } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { theme } from '@/constants/theme';
import { signUpMerchant, startPhoneSignIn, verifyPhoneSignIn } from '@/hooks/useAuth';
import type { UserRole } from '@/types';
import { RoleToggle } from './login';

export default function RegisterScreen() {
  const [role, setRole] = useState<UserRole>('client');

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Text style={styles.title}>Créer un compte</Text>
        <Text style={styles.subtitle}>C'est rapide et gratuit pour les clients.</Text>
      </View>

      <RoleToggle role={role} onChange={setRole} />

      {role === 'client' ? <ClientRegister /> : <MerchantRegister />}

      <View style={styles.footer}>
        <Text style={styles.footerText}>Déjà un compte ?</Text>
        <Link href="/(auth)/login" style={styles.link}>
          Se connecter
        </Link>
      </View>
    </Screen>
  );
}

function ClientRegister() {
  const [firstName, setFirstName] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendCode() {
    setLoading(true);
    setError(null);
    const { error } = await startPhoneSignIn(phone);
    setLoading(false);
    if (error) setError(error);
    else setOtpSent(true);
  }

  async function verify() {
    setLoading(true);
    setError(null);
    const { error } = await verifyPhoneSignIn(phone, code, firstName);
    setLoading(false);
    if (error) setError(error);
  }

  return (
    <View>
      <Input
        label="Prénom"
        placeholder="Ton prénom"
        value={firstName}
        onChangeText={setFirstName}
        editable={!otpSent}
      />
      <Input
        label="Téléphone"
        placeholder="+590 690 00 00 00"
        keyboardType="phone-pad"
        autoComplete="tel"
        value={phone}
        onChangeText={setPhone}
        editable={!otpSent}
      />
      {otpSent ? (
        <Input
          label="Code reçu par SMS"
          placeholder="123456"
          keyboardType="number-pad"
          value={code}
          onChangeText={setCode}
        />
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {otpSent ? (
        <Button label="Valider mon compte" onPress={verify} loading={loading} />
      ) : (
        <Button
          label="Recevoir le code"
          onPress={sendCode}
          loading={loading}
          disabled={!firstName || !phone}
        />
      )}
    </View>
  );
}

function MerchantRegister() {
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
    if (error) setError(error);
    else setDone(true);
  }

  if (done) {
    return (
      <Text style={styles.success}>
        Compte créé ! Vérifie ta boîte mail pour confirmer ton adresse, puis connecte-toi.
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
  header: { marginTop: theme.spacing.xl, marginBottom: theme.spacing.lg },
  title: { fontSize: theme.fontSize.display, fontWeight: '800', color: theme.colors.text },
  subtitle: { fontSize: theme.fontSize.lg, color: theme.colors.textSecondary, marginTop: theme.spacing.xs },
  error: { color: theme.colors.danger, marginBottom: theme.spacing.md, fontSize: theme.fontSize.sm },
  success: { color: theme.colors.success, fontSize: theme.fontSize.md, fontWeight: '600' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: theme.spacing.xl, gap: theme.spacing.xs },
  footerText: { color: theme.colors.textSecondary, fontSize: theme.fontSize.md },
  link: { color: theme.colors.primary, fontWeight: '700', fontSize: theme.fontSize.md },
});
