/**
 * Client Supabase initialisé pour React Native.
 *
 * - AsyncStorage comme stockage de session (persistance entre lancements).
 * - autoRefreshToken activé pour garder la session valide.
 * - react-native-url-polyfill requis car le SDK utilise l'API URL.
 */
import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

import type { Database } from '@/types';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // On échoue tôt et clairement plutôt que d'avoir des erreurs réseau obscures.
  console.warn(
    '[supabase] EXPO_PUBLIC_SUPABASE_URL ou EXPO_PUBLIC_SUPABASE_ANON_KEY manquant. ' +
      'Renseigne ton fichier .env (voir .env.example).',
  );
}

export const supabase = createClient<Database>(
  supabaseUrl ?? 'http://localhost',
  supabaseAnonKey ?? 'public-anon-key',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      // detectSessionInUrl désactivé : pas de redirection web, app native uniquement.
      detectSessionInUrl: false,
    },
  },
);
