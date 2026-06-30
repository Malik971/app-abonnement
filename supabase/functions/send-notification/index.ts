// ============================================================================
// Edge function : send-notification
// Envoie une notification push aux clients d'un commerçant via l'API Expo Push.
//
// Règles métier :
//   - Seuls les plans Pro / Premium peuvent envoyer (MUR 2).
//   - target = 'all' | 'inactive' (inactifs depuis 21+ jours).
//   - L'envoi se fait UNIQUEMENT côté serveur (clé service role), jamais
//     depuis l'app cliente.
//
// Déploiement :
//   supabase functions deploy send-notification
// Secrets requis : SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (injectés par défaut).
// ============================================================================
import { createClient } from 'jsr:@supabase/supabase-js@2';

const INACTIVE_THRESHOLD_DAYS = 21;
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface Payload {
  merchantId: string;
  message: string;
  target: 'all' | 'inactive';
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return json({ error: 'Méthode non autorisée' }, 405);
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // Client "utilisateur" : pour vérifier l'identité de l'appelant.
  const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });
  // Client "admin" : pour lire les tokens au-delà des RLS.
  const admin = createClient(supabaseUrl, serviceKey);

  const { data: userData } = await userClient.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return json({ error: 'Non authentifié' }, 401);

  let body: Payload;
  try {
    body = (await req.json()) as Payload;
  } catch {
    return json({ error: 'Corps invalide' }, 400);
  }

  const message = (body.message ?? '').trim().slice(0, 200);
  if (!message) return json({ error: 'Message vide' }, 400);

  // Vérifie que le commerçant existe, appartient à l'appelant, et a le bon plan.
  const { data: merchant } = await admin
    .from('merchants')
    .select('id, user_id, plan, trial_ends_at, stripe_subscription_id')
    .eq('id', body.merchantId)
    .single();

  if (!merchant || merchant.user_id !== userId) {
    return json({ error: 'Commerce introuvable' }, 403);
  }

  // Plan « effectif » : l'essai Pro (60 jours) débloque l'envoi, comme côté app.
  const inTrial =
    !merchant.stripe_subscription_id &&
    merchant.plan === 'starter' &&
    merchant.trial_ends_at != null &&
    new Date(merchant.trial_ends_at as string).getTime() > Date.now();
  const effectivePlan = merchant.plan !== 'starter' ? merchant.plan : inTrial ? 'pro' : 'starter';

  if (effectivePlan === 'starter') {
    return json({ error: 'Les notifications nécessitent le plan Pro.' }, 402);
  }

  // Récupère les cartes (et clients) du commerce.
  const { data: cards } = await admin
    .from('loyalty_cards')
    .select('last_visit_at, clients(push_token)')
    .eq('merchant_id', merchant.id);

  const now = Date.now();
  const tokens: string[] = [];
  for (const card of cards ?? []) {
    // deno-lint-ignore no-explicit-any
    const token = (card as any).clients?.push_token as string | null;
    if (!token) continue;
    if (body.target === 'inactive') {
      // deno-lint-ignore no-explicit-any
      const last = (card as any).last_visit_at as string | null;
      const days = last ? (now - new Date(last).getTime()) / 86_400_000 : Infinity;
      if (days < INACTIVE_THRESHOLD_DAYS) continue;
    }
    tokens.push(token);
  }

  if (tokens.length === 0) return json({ sent: 0 });

  // Expo accepte des lots de 100 messages.
  let sent = 0;
  for (let i = 0; i < tokens.length; i += 100) {
    const batch = tokens.slice(i, i + 100).map((to) => ({
      to,
      sound: 'default',
      body: message,
    }));
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(batch),
    });
    if (res.ok) sent += batch.length;
  }

  return json({ sent });
});

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
