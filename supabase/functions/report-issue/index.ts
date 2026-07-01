// ============================================================================
// Edge function : report-issue
// Reçoit un signalement de bug depuis l'app (client ou commerçant) et l'envoie
// par email au support via Resend. Le corps inclut le rôle, l'email, le user ID
// et le message. Tout se passe dans l'app (bottom sheet), sans redirection.
//
// Secrets : SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY,
//           SUPPORT_EMAIL (ou à défaut ADMIN_EMAIL), RESEND_API_KEY, RESEND_FROM
// Déploiement : supabase functions deploy report-issue
// ============================================================================
import { createClient } from 'jsr:@supabase/supabase-js@2';

import { sendEmail } from '../_shared/email.ts';

const SUPPORT_EMAIL = Deno.env.get('SUPPORT_EMAIL') ?? Deno.env.get('ADMIN_EMAIL') ?? '';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ ok: false, error: 'Méthode non autorisée' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });
  const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  const { data: userData } = await userClient.auth.getUser();
  const user = userData.user;
  if (!user?.id) return json({ ok: false, error: 'Non authentifié' }, 401);

  if (!SUPPORT_EMAIL) return json({ ok: false, error: 'Support non configuré.' }, 500);

  let message = '';
  try {
    message = ((await req.json()).message ?? '').toString().trim().slice(0, 2000);
  } catch {
    return json({ ok: false, error: 'Corps invalide' }, 400);
  }
  if (!message) return json({ ok: false, error: 'Message vide' }, 400);

  // Rôle via la table profiles (service role pour contourner les RLS).
  const { data: profile } = await admin.from('profiles').select('role').eq('user_id', user.id).maybeSingle();
  const role = (profile?.role as string) ?? 'inconnu';

  const html = `
    <h2>Signalement Fidéli</h2>
    <p><strong>Rôle :</strong> ${escapeHtml(role)}</p>
    <p><strong>Email :</strong> ${escapeHtml(user.email ?? 'Non renseigné')}</p>
    <p><strong>User ID :</strong> <code>${escapeHtml(user.id)}</code></p>
    <p><strong>Message :</strong></p>
    <p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>
  `;

  const sent = await sendEmail({ to: SUPPORT_EMAIL, subject: `Signalement Fidéli (${role})`, html });
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
