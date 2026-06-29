// ============================================================================
// Edge function : reject-merchant
// Refuse un commerçant (approval_status = 'rejected') et l'avertit par email
// avec le motif.
//
// Accès RÉSERVÉ au service_role (Bearer = clé service role).
//
// Body : { merchant_id: string, reason: string }
// Secrets : SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, RESEND_FROM
// Déploiement : supabase functions deploy reject-merchant
// ============================================================================
import { createClient } from 'jsr:@supabase/supabase-js@2';

import { sendEmail } from '../_shared/email.ts';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ ok: false, error: 'Méthode non autorisée' }, 405);

  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (token !== serviceKey) return json({ ok: false, error: 'Accès refusé' }, 401);

  let merchantId: string;
  let reason: string;
  try {
    const body = await req.json();
    merchantId = body.merchant_id;
    reason = (body.reason ?? '').toString().trim();
  } catch {
    return json({ ok: false, error: 'Corps invalide' }, 400);
  }
  if (!merchantId || !reason) return json({ ok: false, error: 'merchant_id et reason requis' }, 400);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey);

  const { data: merchant, error } = await admin
    .from('merchants')
    .update({ approval_status: 'rejected', rejection_reason: reason, approved_at: null })
    .eq('id', merchantId)
    .select('business_name, user_id')
    .single();

  if (error || !merchant) return json({ ok: false, error: error?.message ?? 'Commerce introuvable' }, 404);

  const { data: userRes } = await admin.auth.admin.getUserById(merchant.user_id as string);
  const email = userRes.user?.email;
  if (email) {
    await sendEmail({
      to: email,
      subject: 'Ton inscription Fidéli n’a pas été validée',
      html: `
        <h2>Inscription non validée</h2>
        <p>Bonjour, l'inscription de <strong>${escapeHtml(merchant.business_name as string)}</strong> sur Fidéli n'a pas pu être validée pour le motif suivant :</p>
        <p><em>${escapeHtml(reason)}</em></p>
        <p>Pour toute question, écris-nous à support@fideli.app.</p>
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
