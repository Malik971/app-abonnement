// ============================================================================
// Edge function : notify-merchant-signup
// Appelée par l'app juste après l'inscription d'un commerçant. Envoie un email
// récapitulatif à l'admin (ADMIN_EMAIL) pour validation manuelle.
//
// Auth : utilisateur connecté (le commerçant qui vient de s'inscrire). On lit
// SON commerce via le service role, pas besoin d'envoyer d'id depuis l'app.
//
// Secrets : SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY,
//           ADMIN_EMAIL, RESEND_API_KEY, RESEND_FROM
// Déploiement : supabase functions deploy notify-merchant-signup
// ============================================================================
import { createClient } from 'jsr:@supabase/supabase-js@2';

import { sendEmail } from '../_shared/email.ts';

const SUPABASE_PROJECT_EDITOR = 'https://supabase.com/dashboard/project/fnequkdoiqphvnlkfskh/editor';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ ok: false, error: 'Méthode non autorisée' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const adminEmail = Deno.env.get('ADMIN_EMAIL') ?? '';

  const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });
  const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  const { data: userData } = await userClient.auth.getUser();
  const user = userData.user;
  if (!user?.id) return json({ ok: false, error: 'Non authentifié' }, 401);

  if (!adminEmail) return json({ ok: false, error: 'ADMIN_EMAIL non configuré.' }, 500);

  const { data: merchant } = await admin
    .from('merchants')
    .select('id, business_name, business_type, created_at')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!merchant) return json({ ok: false, error: 'Commerce introuvable' }, 404);

  const createdAt = new Date(merchant.created_at as string).toLocaleString('fr-FR');
  const html = `
    <h2>Nouvelle inscription commerçant sur Fidéli</h2>
    <p><strong>Commerce :</strong> ${escapeHtml(merchant.business_name as string)}</p>
    <p><strong>Type :</strong> ${escapeHtml((merchant.business_type as string) ?? 'Non renseigné')}</p>
    <p><strong>Email :</strong> ${escapeHtml(user.email ?? 'Non renseigné')}</p>
    <p><strong>Date :</strong> ${escapeHtml(createdAt)}</p>
    <p><strong>merchant_id :</strong> <code>${escapeHtml(merchant.id as string)}</code></p>
    <p>Option 1, Table Editor : change <code>approval_status</code> en <code>approved</code> :</p>
    <p><a href="${SUPABASE_PROJECT_EDITOR}">${SUPABASE_PROJECT_EDITOR}</a></p>
    <p>Option 2, Fonction (sans dashboard) : appelle <code>approve-merchant</code> avec ce merchant_id et ta clé service role.</p>
  `;

  const sent = await sendEmail({ to: adminEmail, subject: `Fidéli, nouveau commerce : ${merchant.business_name}`, html });
  if (!sent.ok) return json({ ok: false, error: sent.error }, 500);

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
