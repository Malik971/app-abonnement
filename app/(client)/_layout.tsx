import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Tabs } from 'expo-router';
import { useEffect } from 'react';

import { theme } from '@/constants/theme';
import { useNotifications } from '@/hooks/useNotifications';
import { useOfflineQueue } from '@/hooks/useOfflineQueue';
import { fetchClientByUser } from '@/lib/queries';
import { useAuthStore } from '@/stores/authStore';
import { useClientStore } from '@/stores/clientStore';

function TabIcon({ name, color }: { name: keyof typeof Ionicons.glyphMap; color: string }) {
  return <Ionicons name={name} size={24} color={color} />;
}

export default function ClientLayout() {
  const userId = useAuthStore((s) => s.user?.id);
  const setClient = useClientStore((s) => s.setClient);
  const client = useClientStore((s) => s.client);
  const { enablePush } = useNotifications();

  // Garde la queue offline synchronisée pendant toute la session client.
  useOfflineQueue();

  // Charge le profil client et le met dans le store.
  const { data } = useQuery({
    queryKey: ['client', userId],
    queryFn: () => fetchClientByUser(userId!),
    enabled: Boolean(userId),
  });

  useEffect(() => {
    if (data) setClient(data);
  }, [data, setClient]);

  // Enregistre le push token (sans bloquer si refus).
  useEffect(() => {
    if (client?.id) void enablePush(client.id);
  }, [client?.id, enablePush]);

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
        name="index"
        options={{ title: 'Mes cartes', tabBarIcon: ({ color }) => <TabIcon name="card-outline" color={color} /> }}
      />
      <Tabs.Screen
        name="scan"
        options={{ title: 'Scanner', tabBarIcon: ({ color }) => <TabIcon name="scan-outline" color={color} /> }}
      />
      <Tabs.Screen
        name="rewards"
        options={{ title: 'Récompenses', tabBarIcon: ({ color }) => <TabIcon name="gift-outline" color={color} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profil', tabBarIcon: ({ color }) => <TabIcon name="person-outline" color={color} /> }}
      />
      {/* Écran de recherche : navigable mais masqué de la barre d'onglets. */}
      <Tabs.Screen name="search" options={{ href: null }} />
    </Tabs>
  );
}
