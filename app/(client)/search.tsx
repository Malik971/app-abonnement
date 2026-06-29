import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { theme } from '@/constants/theme';
import { joinLoyaltyProgram, searchMerchants } from '@/lib/queries';
import { useAuthStore } from '@/stores/authStore';
import { useClientStore } from '@/stores/clientStore';
import { useGuestStore } from '@/stores/guestStore';
import type { MerchantSearchResult } from '@/types';

export default function SearchScreen() {
  const router = useRouter();
  const client = useClientStore((s) => s.client);
  const session = useAuthStore((s) => s.session);
  const requireAuth = useGuestStore((s) => s.requireAuth);
  const queryClient = useQueryClient();
  const [term, setTerm] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const { data: results = [], isFetching } = useQuery({
    queryKey: ['merchant-search', term.trim()],
    queryFn: () => searchMerchants(term),
    enabled: term.trim().length >= 2,
  });

  async function join(item: MerchantSearchResult) {
    // Mode invité : rejoindre = vraie action → mur de création de compte.
    if (!session) {
      requireAuth('rejoindre ce commerce');
      return;
    }
    setBusyId(item.merchant_id);
    setNotice(null);
    const res = await joinLoyaltyProgram(item.merchant_id);
    setBusyId(null);

    if (res.ok) {
      await queryClient.invalidateQueries({ queryKey: ['client-cards', client?.id] });
      router.replace('/(client)');
      return;
    }
    if (res.error === 'merchant_full') {
      setNotice("Ce commerce ne peut pas accepter de nouveaux membres pour l'instant.");
    } else {
      setNotice("Impossible de rejoindre ce commerce. Réessaie plus tard.");
    }
  }

  const tooShort = term.trim().length < 2;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: true, title: 'Chercher un commerce' }} />

      <View style={styles.searchWrap}>
        <TextInput
          style={styles.input}
          placeholder="Nom du commerce…"
          placeholderTextColor={theme.colors.textSecondary}
          value={term}
          onChangeText={setTerm}
          autoFocus
          autoCorrect={false}
          returnKeyType="search"
        />
      </View>

      {notice ? <Text style={styles.notice}>{notice}</Text> : null}

      {tooShort ? (
        <EmptyState icon="search-outline" title="Cherche ton commerce" subtitle="Tape au moins 2 lettres du nom du commerce." />
      ) : isFetching ? (
        <ActivityIndicator style={styles.loader} color={theme.colors.primary} />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.merchant_id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Card style={styles.row}>
              <View style={styles.info}>
                <Text style={styles.name}>{item.business_name}</Text>
                {item.business_type ? <Text style={styles.type}>{item.business_type}</Text> : null}
              </View>
              <Button label="Rejoindre" onPress={() => join(item)} loading={busyId === item.merchant_id} style={styles.joinBtn} />
            </Card>
          )}
          ListEmptyComponent={
            <EmptyState icon="sad-outline" title="Aucun commerce trouvé" subtitle="Vérifie l'orthographe ou demande son QR code au commerçant." />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  searchWrap: { padding: theme.spacing.md },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    fontSize: theme.fontSize.lg,
    color: theme.colors.text,
    backgroundColor: theme.colors.surface,
  },
  notice: {
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    color: theme.colors.danger,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
  },
  loader: { marginTop: theme.spacing.xxl },
  list: { paddingHorizontal: theme.spacing.md, gap: theme.spacing.sm, flexGrow: 1 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  info: { flex: 1, marginRight: theme.spacing.sm },
  name: { fontSize: theme.fontSize.lg, fontWeight: '700', color: theme.colors.text },
  type: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, marginTop: 2 },
  joinBtn: { paddingHorizontal: theme.spacing.lg, height: 44 },
});
