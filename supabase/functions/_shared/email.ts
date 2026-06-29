// ============================================================================
// Helper d'envoi d'email partagé (Resend).
//
// Secrets requis :
//   RESEND_API_KEY : clé API Resend (https://resend.com)
//   RESEND_FROM    : expéditeur vérifié, ex : "Fidéli <no-reply@tondomaine.fr>"
//
// Aucune clé en dur — tout vient des secrets Supabase.
// ============================================================================
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const RESEND_FROM = Deno.env.get('RESEND_FROM') ?? '';

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailInput): Promise<{ ok: boolean; error?: string }> {
  if (!RESEND_API_KEY || !RESEND_FROM) {
    return { ok: false, error: 'Email non configuré (RESEND_API_KEY / RESEND_FROM manquants).' };
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: RESEND_FROM, to, subject, html }),
  });
  if (!res.ok) {
    return { ok: false, error: `Resend ${res.status}: ${await res.text()}` };
  }
  return { ok: true };
}
