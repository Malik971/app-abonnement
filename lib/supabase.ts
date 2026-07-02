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
import { AppState } from 'react-native';

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

// ─────────────────────────────────────────────────────────────────────────────
// DEVELOPPEMENT : Désactive "Confirm email" dans Supabase Dashboard
// URL : https://supabase.com/dashboard/project/[TON_PROJECT_ID]/auth/providers
// Toggle "Confirm email" → OFF
// Cela permet de réutiliser le même email à chaque test sans confirmation.
// Pour supprimer un utilisateur bloqué :
// URL : https://supabase.com/dashboard/project/[TON_PROJECT_ID]/auth/users
// Clique sur les 3 points → Delete user
//
// Aucune redirect URL n'est nécessaire ici : l'app est 100 % native
// (detectSessionInUrl: false). Le code OTP saisi dans l'app suffit.
// ─────────────────────────────────────────────────────────────────────────────
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

// Rafraîchit le token tant que l'app est au premier plan (recommandation
// Supabase pour React Native). Combiné à persistSession + AsyncStorage, la
// session est restaurée au démarrage et l'utilisateur reste connecté tant qu'il
// ne se déconnecte pas manuellement.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    void supabase.auth.startAutoRefresh();
  } else {
    void supabase.auth.stopAutoRefresh();
  }
});
