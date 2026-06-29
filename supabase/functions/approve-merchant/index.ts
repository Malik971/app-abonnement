// ============================================================================
// Edge function : approve-merchant
// Valide un commerçant (approval_status = 'approved') et l'avertit par email.
//
// Accès RÉSERVÉ au service_role : l'appelant DOIT fournir la clé service role
// dans l'en-tête Authorization (Bearer). Destinée à un futur panneau admin.
//
// Body : { merchant_id: string }
// Secrets : SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, RESEND_FROM
// Déploiement : supabase functions deploy approve-merchant
// ============================================================================
import { createClient } from 'jsr:@supabase/supabase-js@2';

import { sendEmail } from '../_shared/email.ts';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ ok: false, error: 'Méthode non autorisée' }, 405);

  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (token !== serviceKey) return json({ ok: false, error: 'Accès refusé' }, 401);

  let merchantId: string;
  try {
    merchantId = (await req.json()).merchant_id;
  } catch {
    return json({ ok: false, error: 'Corps invalide' }, 400);
  }
  if (!merchantId) return json({ ok: false, error: 'merchant_id requis' }, 400);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey);

  const { data: merchant, error } = await admin
    .from('merchants')
    .update({ approval_status: 'approved', approved_at: new Date().toISOString(), rejection_reason: null })
    .eq('id', merchantId)
    .select('business_name, user_id')
    .single();

  if (error || !merchant) return json({ ok: false, error: error?.message ?? 'Commerce introuvable' }, 404);

  // Email au commerçant (best-effort : on n'échoue pas l'approbation si l'email casse).
  const { data: userRes } = await admin.auth.admin.getUserById(merchant.user_id as string);
  const email = userRes.user?.email;
  if (email) {
    const name = merchant.business_name as string;
    await sendEmail({
      to: email,
      subject: 'Ton commerce est activé sur Fidéli',
      html: `
        <h2>Bonjou ! Bonne nouvelle.</h2>
        <p><strong>${escapeHtml(name)}</strong> est maintenant actif sur Fidéli.</p>
        <p>Tu peux te connecter et commencer à fidéliser tes clients. Chaque passage compte.</p>
      `,
    });
  }

  return json({ ok: true });
});

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
  );
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
