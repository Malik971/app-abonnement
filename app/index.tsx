import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { theme } from '@/constants/theme';

/**
 * Route initiale '/'. Affiche un loader le temps que la garde du root layout
 * redirige vers consent / auth / (client) / (merchant) selon l'état.
 */
export default function Index() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
  },
});
