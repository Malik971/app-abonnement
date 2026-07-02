-- ============================================================================
-- Migration 011 : informations légales du commerce
-- SIREN et nom du dirigeant, préremplis depuis l'API entreprises à l'inscription
-- (champs optionnels, modifiables). Idempotente.
-- ============================================================================

alter table merchants add column if not exists siren text;
alter table merchants add column if not exists director_name text;
