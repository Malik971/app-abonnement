-- ============================================================================
-- Migration 008 : Essai Pro gratuit de 2 mois
-- Tout nouveau commerçant bénéficie de 60 jours d'accès aux fonctionnalités Pro
-- dès la création de son compte. Passé ce délai, sans abonnement payant, il
-- repasse en Starter (le plan « effectif » est calculé côté app + edge function).
-- Idempotente.
-- ============================================================================

alter table merchants
  add column if not exists trial_ends_at timestamptz default (now() + interval '60 days');

-- Backfill : les commerçants déjà inscrits obtiennent 60 jours depuis leur création.
update merchants
  set trial_ends_at = created_at + interval '60 days'
  where trial_ends_at is null;
