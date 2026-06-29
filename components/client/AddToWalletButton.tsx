import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';
import { useGoogleWallet } from '@/hooks/useGoogleWallet';
import type { LoyaltyCardWithDetails } from '@/types';

interface AddToWalletButtonProps {
  card: LoyaltyCardWithDetails;
  clientFirstName: string | null;
}

/**
 * Bouton « Ajouter à Google Wallet » au style officiel (fond noir, texte blanc).
 * Visible uniquement sur Android. Une instance par carte → état loading/erreur
 * isolé carte par carte.
 *
 * NB : pour une mise en production, remplacer l'icône par l'asset officiel du
 * bouton Google Wallet (charte de marque Google).
 */
export function AddToWalletButton({ card, clientFirstName }: AddToWalletButtonProps) {
  const { addToWallet, loading, error, clearError, isAndroid } = useGoogleWallet();

  // L'erreur disparaît automatiquement après 3 secondes.
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(clearError, 3000);
    return () => clearTimeout(t);
  }, [error, clearError]);

  if (!isAndroid) return null;

  return (
    <View>
      <Pressable
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={() => void addToWallet(card, clientFirstName)}
        disabled={loading}
        accessibilityRole="button"
        accessibilityLabel="Ajouter à Google Wallet"
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <Ionicons name="logo-google" size={18} color="#FFFFFF" />
            <Text style={styles.label}>Ajouter à Google Wallet</Text>
          </>
        )}
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
    borderRadius: 4,
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 8,
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.7 },
  label: { color: '#FFFFFF', fontWeight: '700', fontSize: theme.fontSize.md },
  error: {
    color: theme.colors.danger,
    fontSize: theme.fontSize.sm,
    textAlign: 'center',
    marginTop: 4,
  },
});
