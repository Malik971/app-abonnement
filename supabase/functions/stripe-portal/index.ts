// ============================================================================
// Edge function : stripe-portal
// Ouvre le portail de facturation Stripe (résiliation, factures, moyen de paiement).
//
// Body : { merchantId: string }
// Secrets : STRIPE_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, APP_DEEP_LINK
// Déploiement : supabase functions deploy stripe-portal
// ============================================================================
import Stripe from 'npm:stripe@17';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-12-18.acacia',
  httpClient: Stripe.createFetchHttpClient(),
});

const DEEP_LINK = Deno.env.get('APP_DEEP_LINK') ?? 'fidelite://';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Méthode non autorisée' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });

  const { data: userData } = await userClient.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return json({ error: 'Non authentifié' }, 401);

  const { merchantId } = (await req.json()) as { merchantId: string };

  const { data: merchant } = await admin
    .from('merchants')
    .select('user_id, stripe_customer_id')
    .eq('id', merchantId)
    .single();

  if (!merchant || merchant.user_id !== userId || !merchant.stripe_customer_id) {
    return json({ error: 'Abonnement introuvable' }, 403);
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: merchant.stripe_customer_id,
    return_url: `${DEEP_LINK}merchant/settings`,
  });

  return json({ url: session.url });
});

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
