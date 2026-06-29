# Configuration Google Wallet

## Étapes obligatoires avant le premier déploiement

### 1. Créer le compte Issuer
- Va sur https://pay.google.com/business/console
- Connecte-toi avec ton compte Google
- Crée un compte Issuer (nom public : "Fidéli")
- Note ton Issuer ID (long nombre visible dans l'URL)

### 2. Créer le projet Google Cloud
- Va sur https://console.cloud.google.com
- Crée un projet "fideli-wallet"
- Active l'API "Google Wallet API" (cherche dans la bibliothèque d'APIs)

### 3. Créer le compte de service
- Dans ton projet Cloud : IAM & Admin > Comptes de service
- Crée un compte de service (nom : "fideli-wallet-service")
- Télécharge la clé JSON (Actions > Gérer les clés > Ajouter une clé > JSON)
- La clé contient : `client_email` et `private_key`

### 4. Autoriser le compte de service
- Dans la console Google Wallet, va dans Utilisateurs
- Ajoute le `client_email` du compte de service
- Donne-lui le rôle "Writer"

### 5. Déployer les secrets Supabase
```bash
supabase secrets set GOOGLE_WALLET_ISSUER_ID=TON_ISSUER_ID
supabase secrets set GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL=client_email_du_json
supabase secrets set GOOGLE_WALLET_PRIVATE_KEY="private_key_du_json"
```
> La `private_key` du JSON contient des `\n` : garde-les tels quels (la function
> les normalise). Mets bien la valeur entre guillemets.

### 6. Déployer la function
```bash
supabase functions deploy google-wallet-pass
```

### 7. Passer en production
- Dans la console Google Wallet : demander l'accès production
- En mode démo, seuls les emails de test peuvent ajouter des cartes

## Test en mode démo
1. Dans la Google Wallet Console, ajoute ton email comme testeur
2. Lance l'app sur un vrai Android ou l'émulateur avec Google Wallet installé
3. Appuie sur "Ajouter à Google Wallet" sur une carte
4. La carte s'ouvre dans Google Wallet

## Test local de la function
```bash
supabase functions serve google-wallet-pass --env-file .env
```

## Visuels (placeholders à remplacer)
La function utilise pour l'instant des images placeholder (via.placeholder.com),
définies en haut de `supabase/functions/google-wallet-pass/index.ts` :
- `LOGO_URI`  : logo carré du programme (≈ 150×150, fond rouge, "F" blanc)
- `HERO_URI`  : bandeau de carte (1032×336)

Remplace ces deux constantes par les URLs publiques de tes vrais visuels Fidéli
(héberge-les, par ex. dans un bucket Supabase Storage public).

## Notes importantes
- Google Wallet ne fonctionne pas sur iOS (pas d'API publique équivalente)
- Le bouton n'est visible que sur Android dans l'app
- En production, Google valide le logo et les images avant approbation
- La mise à jour des points est quasi-instantanée grâce au PATCH API
- Le bouton in-app utilise une icône Google générique : pour le store, le remplacer
  par l'asset officiel "Add to Google Wallet" (charte de marque Google)
