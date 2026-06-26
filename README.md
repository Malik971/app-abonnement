# Fidélité Guadeloupe 🎟️

Application mobile native de fidélisation pour petits commerçants indépendants en Guadeloupe.

Deux espaces dans une seule app :

- **Commerçant** — s'abonne, obtient un dashboard, gère son programme et ses clients.
- **Client final** — installe l'app, scanne un QR code en caisse, cumule des points, débloque des récompenses.

> 100 % React Native natif (iOS + Android). Pas de site web, pas de PWA.

---

## Stack technique

| Domaine | Choix |
| --- | --- |
| Framework | React Native + **Expo SDK 52** |
| Langage | TypeScript **strict** |
| Navigation | **Expo Router** (file-based) |
| Backend | **Supabase** (Postgres, Auth, Storage, Edge Functions) |
| Paiement | **Stripe** (abonnement commerçant uniquement) |
| État | **Zustand** |
| Requêtes / cache | **TanStack Query** |
| Notifications | **Expo Notifications** |
| Offline | **AsyncStorage** + queue de sync différée |
| Scan QR | **expo-camera** (`expo-barcode-scanner` est retiré depuis le SDK 52) |
| Styles | `StyleSheet` natif (aucune lib CSS) |

---

## Prérequis

- Node 20+ (testé sur Node 22)
- `npm`
- L'app **Expo Go** sur ton téléphone (ou un simulateur iOS / émulateur Android)
- Un projet **Supabase** et un compte **Stripe** (voir « À faire manuellement »)

---

## Installation

```bash
npm install
cp .env.example .env   # puis renseigne les valeurs (voir ci-dessous)
npm start              # lance le serveur Expo (QR code à scanner avec Expo Go)
```

Scripts disponibles :

```bash
npm start        # serveur de développement Expo
npm run android  # ouvre sur Android
npm run ios      # ouvre sur iOS
npm run typecheck# vérifie les types (tsc --noEmit)
npm test         # lance les tests unitaires (Jest)
```

---

## Variables d'environnement

Définies dans `.env` (jamais committé). Voir `.env.example`.

| Clé | Côté | Description |
| --- | --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | app | URL du projet Supabase |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | app | Clé anon Supabase |
| `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` | app | Clé publique Stripe |
| `EXPO_PUBLIC_STRIPE_PRICE_STARTER` | app | Price ID Stripe (Starter) |
| `EXPO_PUBLIC_STRIPE_PRICE_PRO` | app | Price ID Stripe (Pro) |
| `EXPO_PUBLIC_STRIPE_PRICE_PREMIUM` | app | Price ID Stripe (Premium) |
| `SUPABASE_SERVICE_ROLE_KEY` | **serveur** | Réservé aux edge functions |
| `STRIPE_SECRET_KEY` | **serveur** | Réservé aux edge functions |
| `STRIPE_WEBHOOK_SECRET` | **serveur** | Vérification de signature webhook |

> ⚠️ Les clés `EXPO_PUBLIC_*` sont embarquées dans le bundle client. Les clés sans préfixe ne doivent **jamais** apparaître dans le code React Native — uniquement comme secrets des edge functions.

---

## Base de données (Supabase)

Les migrations sont dans [`supabase/migrations/`](supabase/migrations) et doivent être appliquées **dans l'ordre** :

1. `001_initial_schema.sql` — tables principales + index
2. `002_rls_policies.sql` — Row Level Security
3. `003_functions.sql` — fonctions SQL (`increment_points`, `update_merchant_client_count`, `sync_offline_scans`, `delete_client_data`)

Avec la CLI Supabase :

```bash
supabase link --project-ref <ref-du-projet>
supabase db push          # applique les migrations
```

Régénère ensuite les types TypeScript (recommandé) :

```bash
npx supabase gen types typescript --project-id <id> > types/database.types.ts
```

et importe `Database` depuis ce fichier dans [`lib/supabase.ts`](lib/supabase.ts) (le projet fournit une définition manuelle de secours dans [`types/index.ts`](types/index.ts) pour compiler hors-ligne).

### Edge Functions

Dans [`supabase/functions/`](supabase/functions) :

- `send-notification` — envoie les push Expo (réservé Pro/Premium)
- `stripe-checkout` — crée une session Stripe Checkout
- `stripe-portal` — ouvre le portail de facturation
- `stripe-webhook` — synchronise le plan du commerçant

Déploiement :

```bash
supabase functions deploy send-notification
supabase functions deploy stripe-checkout
supabase functions deploy stripe-portal
supabase functions deploy stripe-webhook --no-verify-jwt

# Secrets serveur
supabase secrets set STRIPE_SECRET_KEY=sk_live_xxx
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx
supabase secrets set APP_DEEP_LINK=fidelite://
```

---

## Les 3 murs tarifaires

Définis dans [`constants/plans.ts`](constants/plans.ts) :

| Mur | Starter | Pro / Premium |
| --- | --- | --- |
| **1 — Clients** | bloqué à **50 clients** | illimité |
| **2 — Push** | bouton visible mais **verrouillé** | envoi débloqué |
| **3 — Stats** | total des passages seul, blocs détaillés **floutés + cadenas** | stats complètes |

Le mur 1 est aussi appliqué **côté serveur** dans `sync_offline_scans` (un nouveau client est refusé si le Starter est plein), pour qu'il reste fiable même en mode offline.

---

## Offline-first

La connexion en Guadeloupe peut être instable. Côté client :

1. Un scan sans réseau est stocké dans AsyncStorage ([`lib/offline.ts`](lib/offline.ts)).
2. L'UI confirme : « Passage enregistré, sera synchronisé dès que tu as du réseau. »
3. Au retour de la connexion, [`hooks/useOfflineQueue.ts`](hooks/useOfflineQueue.ts) appelle `sync_offline_scans`.
4. **Les points sont crédités à la synchronisation**, pas au scan local.

Côté commerçant, le dashboard utilise le cache TanStack Query (`staleTime` 5 min) et affiche un bandeau « données mises à jour il y a X min » hors-ligne.

---

## RGPD & stores

- Écran de **consentement** au premier lancement ([`app/consent.tsx`](app/consent.tsx)) — le refus bloque l'usage.
- **Suppression de compte** dans le profil client : efface prénom / téléphone / push token et anonymise les scans (`client_id → null`, conservés pour les stats commerçant) via `delete_client_data`.
- Mention « Vos données sont hébergées en Europe. Vous pouvez les supprimer à tout moment. »

---

## Tests

```bash
npm test
```

Couvre les fonctions critiques : calcul de la prochaine récompense, logique des 3 murs, queue offline + synchronisation. Voir [`__tests__/`](__tests__).

---

## Structure du projet

```
app/            écrans (Expo Router) : (auth) (client) (merchant) + consent
components/     ui/ • client/ • merchant/
constants/      plans.ts (murs) • theme.ts
hooks/          useAuth • usePoints • useNotifications • useOfflineQueue
lib/            supabase • stripe • notifications • offline • consent • queries
stores/         authStore • clientStore • merchantStore (Zustand)
supabase/       migrations/ • functions/
types/          index.ts (types + Database)
__tests__/      tests unitaires
```

---

## ⚠️ À faire manuellement avant la mise en production

1. **Renseigner les clés dans `.env`** (Supabase + Stripe) et les **secrets des edge functions** côté Supabase.
2. **Créer les 3 produits/prix dans Stripe** (Starter / Pro 29€ / Premium 69€) et reporter leurs *Price IDs* dans `.env`, puis configurer l'endpoint du **webhook Stripe** vers la function `stripe-webhook` (`STRIPE_WEBHOOK_SECRET`).
3. **Connecter le projet Supabase** : appliquer les migrations (`supabase db push`), déployer les edge functions, et activer le provider **OTP SMS** dans Auth (sinon le fallback magic link email s'applique pour les clients).
```
