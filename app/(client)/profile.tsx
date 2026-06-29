import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { brand } from '@/constants/brand';
import { theme } from '@/constants/theme';
import { signOutUser } from '@/hooks/useAuth';
import { ROUTES } from '@/lib/routes';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useClientStore } from '@/stores/clientStore';
import { useGuestStore } from '@/stores/guestStore';

const SUPPORT_EMAIL = 'support@fideli.app'; // TODO: remplacer par l'adresse réelle

export default function ProfileScreen() {
  const session = useAuthStore((s) => s.session);
  return session ? <ConnectedProfile /> : <GuestProfile />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Invité
// ─────────────────────────────────────────────────────────────────────────────

function GuestProfile() {
  const router = useRouter();
  const requireAuth = useGuestStore((s) => s.requireAuth);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Mon profil</Text>

        <View style={styles.guestHero}>
          <LinearGradient
            colors={[theme.colors.gradientStart, theme.colors.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.guestCircle}
          >
            <Image source={brand.wingsA} style={styles.guestWings} resizeMode="contain" />
          </LinearGradient>
          <Text style={styles.guestText}>
            Crée ton compte pour sauvegarder tes cartes et recevoir tes récompenses.
          </Text>
        </View>

        <Button label="Créer mon compte" onPress={() => requireAuth('gérer ton profil')} />

        <Pressable onPress={() => router.push(ROUTES.merchantLogin)} hitSlop={8} style={styles.merchantLink}>
          <Text style={styles.merchantText}>Je suis commerçant</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Connecté
// ─────────────────────────────────────────────────────────────────────────────

function ConnectedProfile() {
  const router = useRouter();
  const client = useClientStore((s) => s.client);
  const setClient = useClientStore((s) => s.setClient);
  const clearClient = useClientStore((s) => s.clear);
  const email = useAuthStore((s) => s.user?.email);

  const [pushEnabled, setPushEnabled] = useState(client?.push_enabled ?? true);

  const [editOpen, setEditOpen] = useState(false);
  const [draftName, setDraftName] = useState(client?.first_name ?? '');
  const [savingName, setSavingName] = useState(false);

  const [delOpen, setDelOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const canDelete = confirmText.trim().toUpperCase() === 'SUPPRIMER';

  const initial = (client?.first_name?.trim()?.[0] ?? '?').toUpperCase();

  async function togglePush(value: boolean) {
    setPushEnabled(value);
    if (!client?.id) return;
    await supabase.from('clients').update({ push_enabled: value }).eq('id', client.id);
    setClient({ ...client, push_enabled: value });
  }

  async function saveName() {
    const name = draftName.trim();
    if (!name || !client?.id) return;
    setSavingName(true);
    await supabase.from('clients').update({ first_name: name }).eq('id', client.id);
    await supabase.auth.updateUser({ data: { first_name: name } });
    setClient({ ...client, first_name: name });
    setSavingName(false);
    setEditOpen(false);
  }

  async function deleteAccount() {
    if (!client?.id || !canDelete) return;
    setDeleting(true);
    // Anonymise les données personnelles + scans côté serveur (RGPD).
    const { error } = await supabase.rpc('delete_client_data', { p_client_id: client.id });
    setDeleting(false);
    if (error) {
      Alert.alert('Erreur', 'La suppression a échoué. Réessaie plus tard.');
      return;
    }
    clearClient();
    await signOutUser();
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Mon profil</Text>

        {/* Identité */}
        <View style={styles.identity}>
          <LinearGradient
            colors={[theme.colors.gradientStart, theme.colors.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.avatar}
          >
            <Text style={styles.avatarText}>{initial}</Text>
          </LinearGradient>
          <View style={styles.identityText}>
            <Text style={styles.name}>{client?.first_name || 'Client'}</Text>
            <Text style={styles.email}>{email || '—'}</Text>
          </View>
        </View>

        {/* Mon compte */}
        <SectionTitle>Mon compte</SectionTitle>
        <Card style={styles.section}>
          <LinkRow icon="create-outline" label="Modifier mon prénom" onPress={() => { setDraftName(client?.first_name ?? ''); setEditOpen(true); }} />
          <Divider />
          <LinkRow icon="trash-outline" label="Supprimer mon compte" danger onPress={() => { setConfirmText(''); setDelOpen(true); }} />
        </Card>

        {/* Paramètres */}
        <SectionTitle>Paramètres</SectionTitle>
        <Card style={styles.section}>
          <View style={styles.switchRow}>
            <View style={styles.switchLabel}>
              <Ionicons name="notifications-outline" size={20} color={theme.colors.textSecondary} />
              <Text style={styles.linkLabel}>Recevoir les notifications push</Text>
            </View>
            <Switch
              value={pushEnabled}
              onValueChange={togglePush}
              trackColor={{ true: theme.colors.primary, false: theme.colors.border }}
              thumbColor="#FFFFFF"
            />
          </View>
          <Divider />
          <View style={styles.switchRow}>
            <View style={styles.switchLabel}>
              <Ionicons name="language-outline" size={20} color={theme.colors.textSecondary} />
              <Text style={styles.linkLabel}>Langue de l'application</Text>
            </View>
            <Text style={styles.valueMuted}>Français</Text>
          </View>
        </Card>

        {/* Légal et aide */}
        <SectionTitle>Légal et aide</SectionTitle>
        <Card style={styles.section}>
          <LinkRow icon="shield-checkmark-outline" label="Confidentialité et sécurité" onPress={() => router.push(ROUTES.privacy)} />
          <Divider />
          <LinkRow icon="document-text-outline" label="Conditions d'utilisation" onPress={() => router.push(ROUTES.terms)} />
          <Divider />
          <LinkRow icon="help-circle-outline" label="Aide" onPress={() => router.push(ROUTES.help)} />
          <Divider />
          <LinkRow icon="mail-outline" label="Contacter le support" onPress={() => void Linking.openURL(`mailto:${SUPPORT_EMAIL}`)} />
        </Card>

        {/* Session */}
        <View style={styles.sessionActions}>
          <Pressable onPress={() => router.push(ROUTES.merchantLogin)} hitSlop={8} style={styles.merchantLink}>
            <Text style={styles.merchantText}>Je suis commerçant</Text>
          </Pressable>
          <Pressable onPress={() => void signOutUser()} hitSlop={8} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Se déconnecter</Text>
          </Pressable>
        </View>

        <Text style={styles.legal}>
          Vos données sont hébergées en Europe. Vous pouvez les supprimer à tout moment.
        </Text>
      </ScrollView>

      {/* Modal : modifier le prénom */}
      <Modal visible={editOpen} transparent animationType="fade" onRequestClose={() => setEditOpen(false)}>
        <View style={styles.backdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Modifier mon prénom</Text>
            <TextInput
              style={styles.input}
              value={draftName}
              onChangeText={setDraftName}
              placeholder="Ton prénom"
              placeholderTextColor={theme.colors.textSecondary}
              autoFocus
            />
            <Button label="Enregistrer" onPress={saveName} loading={savingName} disabled={!draftName.trim()} />
            <Button label="Annuler" variant="ghost" onPress={() => setEditOpen(false)} />
          </View>
        </View>
      </Modal>

      {/* Modal : suppression en deux étapes */}
      <Modal visible={delOpen} transparent animationType="fade" onRequestClose={() => setDelOpen(false)}>
        <View style={styles.backdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Supprimer ton compte ?</Text>
            <Text style={styles.modalText}>
              Tes données personnelles (prénom, email) et tes cartes de fidélité seront
              effacées définitivement. Pour confirmer, tape SUPPRIMER ci-dessous.
            </Text>
            <TextInput
              style={styles.input}
              value={confirmText}
              onChangeText={setConfirmText}
              placeholder="SUPPRIMER"
              placeholderTextColor={theme.colors.textSecondary}
              autoCapitalize="characters"
            />
            <Button label="Supprimer définitivement" variant="danger" onPress={deleteAccount} loading={deleting} disabled={!canDelete} />
            <Button label="Annuler" variant="ghost" onPress={() => setDelOpen(false)} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Petits composants internes
// ─────────────────────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: string }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

function Divider() {
  return <View style={styles.divider} />;
}

function LinkRow({
  icon,
  label,
  onPress,
  danger = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  const color = danger ? theme.colors.danger : theme.colors.textSecondary;
  return (
    <Pressable style={styles.linkRow} onPress={onPress} accessibilityRole="button">
      <Ionicons name={icon} size={20} color={color} />
      <Text style={[styles.linkLabel, danger && { color: theme.colors.danger }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={theme.colors.locked} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.md, gap: theme.spacing.md },
  title: { fontSize: theme.fontSize.xxl, fontFamily: theme.fonts.titleBold, color: theme.colors.text },

  // Invité
  guestHero: { alignItems: 'center', gap: theme.spacing.md, paddingVertical: theme.spacing.xl },
  guestCircle: { width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center' },
  guestWings: { width: 72, height: 72 * (68 / 257), tintColor: '#FFFFFF' },
  guestText: { fontSize: theme.fontSize.md, color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 21, paddingHorizontal: theme.spacing.md },

  // Identité connecté
  identity: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  avatar: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: theme.fonts.titleBold, color: '#FFFFFF', fontSize: theme.fontSize.xxl },
  identityText: { flex: 1 },
  name: { fontFamily: theme.fonts.titleBold, fontSize: theme.fontSize.xl, color: theme.colors.text },
  email: { fontSize: theme.fontSize.md, color: theme.colors.textSecondary, marginTop: 2 },

  sectionTitle: {
    fontFamily: theme.fonts.mono,
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: theme.spacing.sm,
  },
  section: { gap: 0, paddingVertical: theme.spacing.xs },
  divider: { height: 1, backgroundColor: theme.colors.border, marginVertical: theme.spacing.xs },

  linkRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, paddingVertical: theme.spacing.sm },
  linkLabel: { flex: 1, fontSize: theme.fontSize.md, color: theme.colors.text },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: theme.spacing.sm },
  switchLabel: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, flex: 1 },
  valueMuted: { fontSize: theme.fontSize.md, color: theme.colors.textSecondary },

  sessionActions: { gap: theme.spacing.md, marginTop: theme.spacing.lg, alignItems: 'center' },
  merchantLink: { paddingVertical: theme.spacing.sm },
  merchantText: { color: theme.colors.textSecondary, fontFamily: theme.fonts.mono, fontSize: theme.fontSize.sm, textDecorationLine: 'underline' },
  logoutBtn: { paddingVertical: theme.spacing.sm },
  logoutText: { color: theme.colors.primary, fontFamily: theme.fonts.titleBold, fontSize: theme.fontSize.md },
  legal: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, marginTop: theme.spacing.md, textAlign: 'center' },

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: theme.spacing.lg },
  modalCard: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, padding: theme.spacing.xl, gap: theme.spacing.md, width: '100%' },
  modalTitle: { fontSize: theme.fontSize.xl, fontFamily: theme.fonts.titleBold, color: theme.colors.text },
  modalText: { fontSize: theme.fontSize.md, color: theme.colors.textSecondary, lineHeight: 21 },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: theme.fontSize.lg,
    color: theme.colors.text,
    backgroundColor: theme.colors.background,
  },
});
