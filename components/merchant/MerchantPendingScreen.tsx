import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { theme } from '@/constants/theme';
import { signOutUser } from '@/hooks/useAuth';

const SUPPORT_EMAIL = 'support@fideli.app'; // TODO: remplacer par l'adresse réelle

interface MerchantPendingScreenProps {
  status: 'pending' | 'rejected';
  reason?: string | null;
}

/** Écran affiché tant que le commerçant n'est pas approuvé (attente ou refus). */
export function MerchantPendingScreen({ status, reason }: MerchantPendingScreenProps) {
  const queryClient = useQueryClient();
  const pending = status === 'pending';

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.center}>
        <View style={styles.iconWrap}>
          <Ionicons
            name={pending ? 'time-outline' : 'close-circle-outline'}
            size={52}
            color={pending ? theme.colors.primary : theme.colors.danger}
          />
        </View>

        <Text style={styles.title}>
          {pending ? 'Dossier en cours de vérification' : 'Inscription non validée'}
        </Text>

        <Text style={styles.text}>
          {pending
            ? 'Ton dossier est en cours de vérification. Tu recevras un email dès que ton compte est activé. En général sous 24 à 48h.'
            : reason
              ? `Motif : ${reason}`
              : 'Ton inscription n’a pas pu être validée.'}
        </Text>

        <View style={styles.actions}>
          {pending ? (
            <Button
              label="Rafraîchir"
              variant="secondary"
              onPress={() => void queryClient.invalidateQueries({ queryKey: ['merchant'] })}
            />
          ) : null}
          <Button
            label="Contacter le support"
            variant="ghost"
            onPress={() => void Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
          />
          <Button label="Se déconnecter" variant="ghost" onPress={() => void signOutUser()} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.lg, gap: theme.spacing.md },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  title: { fontFamily: theme.fonts.titleBold, fontSize: theme.fontSize.xl, color: theme.colors.text, textAlign: 'center' },
  text: { fontSize: theme.fontSize.md, color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  actions: { alignSelf: 'stretch', gap: theme.spacing.sm, marginTop: theme.spacing.lg },
});
