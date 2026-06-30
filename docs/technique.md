# Documentation technique : Fidéli

Référence destinée aux développeurs. Le [README](../README.md) s'adresse, lui, au grand public.

## Stack

| Domaine | Choix |
| --- | --- |
| Framework | React Native + Expo SDK 54 |
| Langage | TypeScript strict |
| Navigation | Expo Router (file-based) |
| Backend | Supabase (Postgres, Auth, Storage, Edge Functions) |
| Paiement | Stripe (abonnement commerçant uniquement) |
| État | Zustand |
| Requêtes / cache | TanStack Query |
| Notifications | Expo Notifications |
| Offline | AsyncStorage + queue de synchronisation différée |
| Scan QR | expo-camera |
| Cartes Wallet | Google Wallet (edge function dédiée) |

## Prérequis

- Node 20+ (testé sur Node 22), `npm`
- L'app Expo Go (ou un simulateur iOS / émulateur Android)
- Un projet Supabase et un compte Stripe

## Installation

```bash
npm install
cp .env.example .env   # renseigne les valeurs
npm start              # serveur Expo, QR code à scanner avec Expo Go
```

Scripts : `npm start`, `npm run android`, `npm run ios`, `npm run typecheck`, `npm test`.

> Après ajout de routes, lancer `npx expo start -c` pour régénérer les types de routes.

## Variables d'environnement

Voir `.env.example`. Les clés `EXPO_PUBLIC_*` sont embarquées dans le bundle client ; les clés sans préfixe sont des secrets d'edge functions et ne doivent jamais apparaître dans le code React Native.

App : `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `EXPO_PUBLIC_STRIPE_PRICE_*`.

Serveur (secrets Supabase) : `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `ADMIN_EMAIL`, `RESEND_API_KEY`, `RESEND_FROM`, et les variables `GOOGLE_WALLET_*` (voir `GOOGLE_WALLET_SETUP.md`).

## Base de données

Migrations dans `supabase/migrations/`, appliquées dans l'ordre via `supabase db push` :

1. `001_initial_schema.sql` : tables principales + index
2. `002_rls_policies.sql` : Row Level Security
3. `003_functions.sql` : fonctions SQL (`increment_points`, `update_merchant_client_count`, `sync_offline_scans`, `delete_client_data`)
4. `004_merchant_search.sql` : recherche de commerce + adhésion
5. `005_merchant_approval.sql` : validation manuelle des commerçants (+ garde anti auto-validation)
6. `006_client_preferences.sql` : préférence notifications client
7. `007_merchant_card.sql` : personnalisation de carte (couleur, adresse, description)
8. `008_merchant_trial.sql` : essai Pro de 60 jours
9. `009_merchant_dashboard.sql` : objectifs commerçant + site web

## Edge functions

Dans `supabase/functions/` :

- `send-notification` : push Expo (réservé Pro/Premium, essai compris)
- `stripe-checkout`, `stripe-portal`, `stripe-webhook` : abonnements
- `notify-merchant-signup` : email à l'admin à chaque inscription commerçant
- `approve-merchant`, `reject-merchant` : validation (réservées au service role)
- `google-wallet-pass` : génération / mise à jour des cartes Google Wallet

Déploiement : `supabase functions deploy <nom>`.

## Plans et essai

Définis dans `constants/plans.ts`. Trois paliers (Starter, Pro 29,99€, Premium 69€) et trois murs : limite de 50 clients, notifications push, statistiques détaillées.

Tout nouveau commerçant a un essai Pro de 60 jours (`trial_ends_at`). Le plan « effectif » est calculé par `getEffectivePlan` (côté app et côté edge function) : pendant l'essai, les fonctions Pro sont débloquées ; sans abonnement, retour en Starter à la fin de l'essai. Deux rappels locaux (7 jours puis 1 jour avant la fin) avertissent le commerçant.

## Offline-first

Un scan sans réseau est mis en file dans AsyncStorage ; les points sont crédités à la synchronisation (`sync_offline_scans`), pas au scan local. Le mur des 50 clients est aussi appliqué côté serveur.

## RGPD

Consentement recueilli à la création de compte client ; suppression de compte (anonymisation via `delete_client_data`) ; page de confidentialité in-app.

## Structure

```
app/            écrans Expo Router : (onboarding) (auth) (client) (merchant)
components/     ui/ • client/ • merchant/ • onboarding/
constants/      plans.ts • theme.ts • brand.ts • demoCards.ts
hooks/          useAuth • usePoints • useNotifications • useOfflineQueue • useGoogleWallet • useTrialReminders
lib/            supabase • stripe • notifications • offline • consent • queries • cardView • color • routes
stores/         authStore • clientStore • merchantStore • guestStore (Zustand)
supabase/       migrations/ • functions/
types/          index.ts
__tests__/      tests unitaires
```

## Tests

```bash
npm test
```

Couvre le calcul de la prochaine récompense, les murs tarifaires, l'essai Pro et la queue offline.
