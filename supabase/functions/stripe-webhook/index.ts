// ============================================================================
// Edge function : stripe-webhook
// Reçoit les événements Stripe et synchronise le plan du commerçant en base.
//
// Événements gérés :
//   - checkout.session.completed        → active le plan payant
//   - customer.subscription.updated     → met à jour plan + date de renouvellement
//   - customer.subscription.deleted     → repasse le commerçant en 'starter'
//
// Secrets : STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET,
//           SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// Déploiement (sans vérification JWT, Stripe signe lui-même) :
//   supabase functions deploy stripe-webhook --no-verify-jwt
// Configure ensuite l'endpoint dans le dashboard Stripe.
// ============================================================================
import Stripe from 'npm:stripe@17';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-12-18.acacia',
  httpClient: Stripe.createFetchHttpClient(),
});
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;
const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

type PlanId = 'starter' | 'pro' | 'premium';

Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  if (!signature) return new Response('Signature manquante', { status: 400 });

  const payload = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(payload, signature, webhookSecret);
  } catch (err) {
    return new Response(`Signature invalide: ${(err as Error).message}`, { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const merchantId = session.metadata?.merchant_id;
      const plan = (session.metadata?.plan as PlanId) ?? 'pro';
      if (merchantId && session.subscription) {
        const sub = await stripe.subscriptions.retrieve(session.subscription as string);
        await updateMerchantPlan(merchantId, plan, sub);
      }
      break;
    }
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      const merchantId = sub.metadata?.merchant_id;
      const plan = (sub.metadata?.plan as PlanId) ?? 'pro';
      if (merchantId) {
        // Si l'abonnement n'est plus actif, on repasse en starter.
        const active = sub.status === 'active' || sub.status === 'trialing';
        await updateMerchantPlan(merchantId, active ? plan : 'starter', sub);
      }
      break;
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const merchantId = sub.metadata?.merchant_id;
      if (merchantId) {
        await admin
          .from('merchants')
          .update({ plan: 'starter', plan_expires_at: null, stripe_subscription_id: null })
          .eq('id', merchantId);
      }
      break;
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});

async function updateMerchantPlan(
  merchantId: string,
  plan: PlanId,
  sub: Stripe.Subscription,
): Promise<void> {
  const expiresAt = sub.current_period_end
    ? new Date(sub.current_period_end * 1000).toISOString()
    : null;
  await admin
    .from('merchants')
    .update({
      plan,
      plan_expires_at: expiresAt,
      stripe_subscription_id: sub.id,
    })
    .eq('id', merchantId);
}
