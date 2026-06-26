import { useQuery } from '@tanstack/react-query';
import { Tabs } from 'expo-router';
import { useEffect } from 'react';
import { Text } from 'react-native';

import { theme } from '@/constants/theme';
import { useNotifications } from '@/hooks/useNotifications';
import { fetchMerchantByUser, fetchProgram } from '@/lib/queries';
import { useAuthStore } from '@/stores/authStore';
import { useMerchantStore } from '@/stores/merchantStore';

function TabIcon({ emoji, color }: { emoji: string; color: string }) {
  return <Text style={{ fontSize: 22, color }}>{emoji}</Text>;
}

export default function MerchantLayout() {
  const userId = useAuthStore((s) => s.user?.id);
  const setMerchant = useMerchantStore((s) => s.setMerchant);
  const setProgram = useMerchantStore((s) => s.setProgram);
  const merchant = useMerchantStore((s) => s.merchant);
  const { enablePush } = useNotifications();

  const { data: merchantData } = useQuery({
    queryKey: ['merchant', userId],
    queryFn: () => fetchMerchantByUser(userId!),
    enabled: Boolean(userId),
  });

  useEffect(() => {
    if (merchantData) setMerchant(merchantData);
  }, [merchantData, setMerchant]);

  const { data: programData } = useQuery({
    queryKey: ['program', merchant?.id],
    queryFn: () => fetchProgram(merchant!.id),
    enabled: Boolean(merchant?.id),
  });

  useEffect(() => {
    if (programData) setProgram(programData);
  }, [programData, setProgram]);

  // Le commerçant reçoit aussi des push (ex : alertes) → on enregistre son token.
  useEffect(() => {
    if (merchant?.id) void enablePush(merchant.id);
  }, [merchant?.id, enablePush]);

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
        options={{ title: 'Tableau de bord', tabBarIcon: ({ color }) => <TabIcon emoji="📊" color={color} /> }}
      />
      <Tabs.Screen
        name="clients"
        options={{ title: 'Clients', tabBarIcon: ({ color }) => <TabIcon emoji="👥" color={color} /> }}
      />
      <Tabs.Screen
        name="notifications"
        options={{ title: 'Notifs', tabBarIcon: ({ color }) => <TabIcon emoji="🔔" color={color} /> }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: 'Réglages', tabBarIcon: ({ color }) => <TabIcon emoji="⚙️" color={color} /> }}
      />
    </Tabs>
  );
}
