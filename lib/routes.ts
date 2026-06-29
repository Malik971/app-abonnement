/**
 * Routes centralisées (typées) de l'app.
 *
 * Les types de routes générés par Expo Router (.expo/types) ne se régénèrent
 * qu'au lancement de `expo start`. Pour que le code compile dès maintenant avec
 * les nouvelles routes (onboarding, card/[id], client-signup, merchant-login),
 * on caste ici une fois pour toutes via `Href`. Au prochain `expo start`, les
 * routes seront réellement typées — ces casts resteront sans effet de bord.
 */
import type { Href } from 'expo-router';

export const ROUTES = {
  onboarding: '/(onboarding)/welcome' as Href,
  howItWorks: '/(onboarding)/how-it-works' as Href,
  clientHome: '/(client)' as Href,
  scan: '/(client)/scan' as Href,
  search: '/(client)/search' as Href,
  rewards: '/(client)/rewards' as Href,
  profile: '/(client)/profile' as Href,
  merchantDashboard: '/(merchant)/dashboard' as Href,
  merchantLogin: '/(auth)/merchant-login' as Href,
  clientSignup: '/(auth)/client-signup' as Href,
  card: (id: string): Href => `/(client)/card/${id}` as Href,
  privacy: '/(client)/privacy' as Href,
  terms: '/(client)/terms' as Href,
  help: '/(client)/help' as Href,
} as const;
