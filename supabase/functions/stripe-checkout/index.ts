// ============================================================================
// Edge function : stripe-checkout
// Crée une session Stripe Checkout (abonnement commerçant) et renvoie son URL.
//
// Body : { merchantId: string, plan: 'pro' | 'premium', priceId: string }
// Secrets : STRIPE_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
//           APP_DEEP_LINK (ex : fidelite://merchant/settings)
//
// Déploiement : supabase functions deploy stripe-checkout
// ============================================================================
import Stripe from 'npm:stripe@17';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-12-18.acacia',
  httpClient: Stripe.createFetchHttpClient(),
});

const DEEP_LINK = Deno.env.get('APP_DEEP_LINK') ?? 'fidelite://';

interface Payload {
  merchantId: string;
  plan: 'pro' | 'premium';
  priceId: string;
}

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

  const body = (await req.json()) as Payload;

  const { data: merchant } = await admin
    .from('merchants')
    .select('id, user_id, stripe_customer_id')
    .eq('id', body.merchantId)
    .single();

  if (!merchant || merchant.user_id !== userId) {
    return json({ error: 'Commerce introuvable' }, 403);
  }

  // Crée (ou réutilise) le client Stripe.
  let customerId = merchant.stripe_customer_id as string | null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: userData.user?.email ?? undefined,
      metadata: { merchant_id: merchant.id },
    });
    customerId = customer.id;
    await admin.from('merchants').update({ stripe_customer_id: customerId }).eq('id', merchant.id);
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: body.priceId, quantity: 1 }],
    success_url: `${DEEP_LINK}merchant/settings?checkout=success`,
    cancel_url: `${DEEP_LINK}merchant/settings?checkout=cancel`,
    // metadata propagée vers le webhook pour mettre à jour le plan.
    metadata: { merchant_id: merchant.id, plan: body.plan },
    subscription_data: { metadata: { merchant_id: merchant.id, plan: body.plan } },
  });

  return json({ url: session.url });
});

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
