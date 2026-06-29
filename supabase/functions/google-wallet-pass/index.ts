// ============================================================================
// Edge function : google-wallet-pass
// Gère les cartes de fidélité Fidéli dans Google Wallet (Android uniquement).
//
// Deux actions selon le body :
//   - action: "generate"      → crée/maj la classe (commerce) + l'objet (carte),
//                               renvoie un lien "Add to Google Wallet".
//   - action: "update_points" → met à jour uniquement les points d'une carte
//                               déjà ajoutée au Wallet (PATCH).
//
// Crypto : signature RS256 du JWT via Web Crypto natif (aucune librairie).
//
// Secrets : GOOGLE_WALLET_ISSUER_ID, GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL,
//           GOOGLE_WALLET_PRIVATE_KEY, SUPABASE_URL, SUPABASE_ANON_KEY
//
// Déploiement : supabase functions deploy google-wallet-pass
// Test local  : supabase functions serve google-wallet-pass --env-file .env
// ============================================================================
import { createClient } from 'jsr:@supabase/supabase-js@2';

const WALLET_API = 'https://walletobjects.googleapis.com/walletobjects/v1';

const issuerId = Deno.env.get('GOOGLE_WALLET_ISSUER_ID') ?? '';
const serviceAccountEmail = Deno.env.get('GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL') ?? '';
const privateKey = Deno.env.get('GOOGLE_WALLET_PRIVATE_KEY') ?? '';

// URL publique du logo (carré) et de l'image hero. À remplacer par tes vrais
// visuels hébergés (voir GOOGLE_WALLET_SETUP.md). Placeholders pour démarrer.
const LOGO_URI = 'https://via.placeholder.com/150x150/D62828/FFFFFF?text=F';
const HERO_URI = 'https://via.placeholder.com/1032x336/D62828/FFFFFF?text=Fideli+-+Chaque+passage+compte';

interface GeneratePayload {
  action: 'generate';
  cardId: string;
  merchantId: string;
  merchantName: string;
  businessType: string | null;
  clientFirstName: string | null;
  currentPoints: number;
  nextRewardPoints: number;
  nextRewardLabel: string;
}

interface UpdatePointsPayload {
  action: 'update_points';
  cardId: string;
  currentPoints: number;
  nextRewardPoints: number;
  nextRewardLabel: string;
}

type Payload = GeneratePayload | UpdatePointsPayload;

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ ok: false, error: 'Méthode non autorisée' }, 405);

  // Auth : on exige un utilisateur connecté (même pattern que les functions Stripe).
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });
  const { data: userData } = await userClient.auth.getUser();
  if (!userData.user?.id) return json({ ok: false, error: 'Non authentifié' }, 401);

  if (!issuerId || !serviceAccountEmail || !privateKey) {
    return json({ ok: false, error: 'Google Wallet non configuré (secrets manquants).' }, 500);
  }

  try {
    const body = (await req.json()) as Payload;
    const accessToken = await getGoogleAccessToken(serviceAccountEmail, privateKey);

    // ── Action : mise à jour des points uniquement ───────────────────────────
    if (body.action === 'update_points') {
      const objectId = `${issuerId}.fideli_card_${body.cardId.replace(/-/g, '')}`;
      const patch = buildPointsPatch(body.currentPoints, body.nextRewardPoints, body.nextRewardLabel);
      const resp = await fetch(`${WALLET_API}/loyaltyObject/${objectId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      // 404 = carte jamais ajoutée au Wallet → rien à mettre à jour (bénin).
      if (!resp.ok && resp.status !== 404) {
        return json({ ok: false, error: `Wallet object PATCH ${resp.status}: ${await resp.text()}` }, 500);
      }
      return json({ ok: true });
    }

    // ── Action : génération du lien "Add to Google Wallet" ───────────────────
    const classId = `${issuerId}.fideli_merchant_${body.merchantId.replace(/-/g, '')}`;
    const objectId = `${issuerId}.fideli_card_${body.cardId.replace(/-/g, '')}`;

    const loyaltyClass = buildClass(classId, body.merchantName);
    const loyaltyObject = buildObject(objectId, classId, body);

    await upsert(accessToken, 'loyaltyClass', classId, loyaltyClass);
    await upsert(accessToken, 'loyaltyObject', objectId, loyaltyObject);

    // JWT "save to wallet" signé par le compte de service.
    const jwtPayload = {
      iss: serviceAccountEmail,
      aud: 'google',
      typ: 'savetowallet',
      iat: Math.floor(Date.now() / 1000),
      payload: { loyaltyObjects: [loyaltyObject] },
    };
    const jwt = await signGoogleWalletJwt(jwtPayload, privateKey);

    return json({
      ok: true,
      walletLink: `https://pay.google.com/gp/v/save/${jwt}`,
      classId,
      objectId,
    });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : 'Erreur inconnue' }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Construction des ressources Google Wallet
// ─────────────────────────────────────────────────────────────────────────────

function buildClass(classId: string, merchantName: string) {
  return {
    id: classId,
    issuerName: 'Fidéli',
    programName: merchantName,
    programLogo: {
      sourceUri: { uri: LOGO_URI },
      contentDescription: { defaultValue: { language: 'fr-FR', value: 'Logo Fidéli' } },
    },
    hexBackgroundColor: '#D62828',
    accountNameLabel: 'Client',
    accountIdLabel: 'Carte',
    rewardsTierLabel: 'Points',
    rewardsTier: 'Fidélité',
    reviewStatus: 'UNDER_REVIEW',
    appLinkData: {
      androidAppLinkInfo: {
        appTarget: {
          targetUri: { uri: 'fidelite://client', description: 'Ouvrir Fidéli' },
        },
      },
    },
  };
}

function buildObject(objectId: string, classId: string, p: GeneratePayload) {
  return {
    id: objectId,
    classId,
    state: 'ACTIVE',
    accountName: p.clientFirstName ?? 'Client',
    accountId: p.cardId.slice(0, 8).toUpperCase(),
    loyaltyPoints: {
      label: 'Points',
      balance: { int: p.currentPoints },
    },
    textModulesData: buildTextModules(p.currentPoints, p.nextRewardPoints, p.nextRewardLabel),
    barcode: {
      type: 'QR_CODE',
      value: p.cardId,
      alternateText: p.cardId.slice(0, 8).toUpperCase(),
    },
    heroImage: {
      sourceUri: { uri: HERO_URI },
      contentDescription: { defaultValue: { language: 'fr-FR', value: 'Fidéli' } },
    },
  };
}

function buildTextModules(current: number, nextPoints: number, nextLabel: string) {
  return [
    {
      header: 'Prochaine récompense',
      body: nextPoints > 0 ? `${nextLabel} à ${nextPoints} points` : 'Programme de fidélité',
      id: 'next_reward',
    },
    {
      header: 'Points actuels',
      body: `${current} / ${nextPoints > 0 ? nextPoints : '?'} points`,
      id: 'current_points',
    },
  ];
}

function buildPointsPatch(current: number, nextPoints: number, nextLabel: string) {
  return {
    loyaltyPoints: { label: 'Points', balance: { int: current } },
    textModulesData: buildTextModules(current, nextPoints, nextLabel),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Appels REST idempotents : GET → 404 ? POST : PUT/PATCH
// ─────────────────────────────────────────────────────────────────────────────

async function upsert(
  token: string,
  resource: 'loyaltyClass' | 'loyaltyObject',
  id: string,
  body: object,
): Promise<void> {
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const getResp = await fetch(`${WALLET_API}/${resource}/${id}`, { headers });

  let writeResp: Response;
  if (getResp.status === 404) {
    writeResp = await fetch(`${WALLET_API}/${resource}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
  } else if (getResp.ok) {
    writeResp = await fetch(`${WALLET_API}/${resource}/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    });
  } else {
    throw new Error(`Wallet ${resource} GET ${getResp.status}: ${await getResp.text()}`);
  }

  if (!writeResp.ok) {
    throw new Error(`Wallet ${resource} write ${writeResp.status}: ${await writeResp.text()}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// OAuth2 (service account) + signature JWT RS256 (Web Crypto natif)
// ─────────────────────────────────────────────────────────────────────────────

async function getGoogleAccessToken(email: string, key: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const claimSet = {
    iss: email,
    scope: 'https://www.googleapis.com/auth/wallet_object.issuer',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const assertion = await signGoogleWalletJwt(claimSet, key);

  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  if (!resp.ok) {
    throw new Error(`OAuth token ${resp.status}: ${await resp.text()}`);
  }
  const data = (await resp.json()) as { access_token: string };
  return data.access_token;
}

async function signGoogleWalletJwt(payload: object, privateKeyPem: string): Promise<string> {
  const pemContents = privateKeyPem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\\n/g, '\n') // au cas où la clé arrive avec des \n littéraux
    .replace(/\n/g, '')
    .trim();

  const binaryKey = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const header = { alg: 'RS256', typ: 'JWT' };
  const headerB64 = b64url(JSON.stringify(header));
  const payloadB64 = b64url(JSON.stringify(payload));
  const signingInput = `${headerB64}.${payloadB64}`;

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signingInput),
  );

  return `${signingInput}.${b64url(new Uint8Array(signature))}`;
}

/** Base64URL d'une chaîne (encodée UTF-8) ou d'octets bruts. */
function b64url(data: string | Uint8Array): string {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
