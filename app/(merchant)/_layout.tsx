import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Tabs } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { MerchantPendingScreen } from '@/components/merchant/MerchantPendingScreen';
import { canSendPush, getEffectivePlan } from '@/constants/plans';
import { theme } from '@/constants/theme';
import { useNotifications } from '@/hooks/useNotifications';
import { useTrialReminders } from '@/hooks/useTrialReminders';
import { ensureProgram, fetchMerchantByUser } from '@/lib/queries';
import { useAuthStore } from '@/stores/authStore';
import { useMerchantStore } from '@/stores/merchantStore';

function TabIcon({
  name,
  color,
  locked = false,
}: {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
  locked?: boolean;
}) {
  return (
    <View style={styles.iconWrap}>
      <Ionicons name={name} size={24} color={color} />
      {locked ? (
        <View style={styles.lockBadge}>
          <Ionicons name="lock-closed" size={10} color={theme.colors.surface} />
        </View>
      ) : null}
    </View>
  );
}

export default function MerchantLayout() {
  const userId = useAuthStore((s) => s.user?.id);
  const setMerchant = useMerchantStore((s) => s.setMerchant);
  const setProgram = useMerchantStore((s) => s.setProgram);
  const merchant = useMerchantStore((s) => s.merchant);
  const { enablePush } = useNotifications();

  const { data: merchantData, isLoading: merchantLoading } = useQuery({
    queryKey: ['merchant', userId],
    queryFn: () => fetchMerchantByUser(userId!),
    enabled: Boolean(userId),
  });

  useEffect(() => {
    if (merchantData) setMerchant(merchantData);
  }, [merchantData, setMerchant]);

  const { data: programData } = useQuery({
    queryKey: ['program', merchant?.id],
    queryFn: () => ensureProgram(merchant!.id),
    enabled: Boolean(merchant?.id),
  });

  useEffect(() => {
    if (programData) setProgram(programData);
  }, [programData, setProgram]);

  // Le commerçant reçoit aussi des push (ex : alertes) → on enregistre son token.
  useEffect(() => {
    if (merchant?.id) void enablePush(merchant.id);
  }, [merchant?.id, enablePush]);

  // Rappels locaux avant la fin de l'essai Pro (7 jours puis 1 jour).
  useTrialReminders(merchantData);

  const effectivePlan = merchantData ? getEffectivePlan(merchantData) : 'starter';

  // Garde de validation : tant que le commerce n'est pas approuvé, pas d'accès
  // au dashboard. Le statut ne peut être changé que côté serveur (migration 005).
  if (merchantLoading) {
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }
  if (merchantData && merchantData.approval_status !== 'approved') {
    return (
      <MerchantPendingScreen
        status={merchantData.approval_status === 'rejected' ? 'rejected' : 'pending'}
        reason={merchantData.rejection_reason}
      />
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{ title: 'Tableau de bord', tabBarIcon: ({ color }) => <TabIcon name="stats-chart-outline" color={color} /> }}
      />
      <Tabs.Screen
        name="clients"
        options={{ title: 'Clients', tabBarIcon: ({ color }) => <TabIcon name="people-outline" color={color} /> }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Notifs',
          tabBarIcon: ({ color }) => (
            <TabIcon name="notifications-outline" color={color} locked={!canSendPush(effectivePlan)} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: 'Réglages', tabBarIcon: ({ color }) => <TabIcon name="settings-outline" color={color} /> }}
      />
      {/* Écrans navigables, masqués de la barre d'onglets. */}
      <Tabs.Screen name="card-design" options={{ href: null }} />
      <Tabs.Screen name="client/[id]" options={{ href: null }} />
      <Tabs.Screen name="help" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loaderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background },
  iconWrap: { width: 28, alignItems: 'center', justifyContent: 'center' },
  lockBadge: {
    position: 'absolute',
    top: -6,
    right: -8,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: theme.colors.locked,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
