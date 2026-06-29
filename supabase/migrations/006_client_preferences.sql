-- ============================================================================
-- Migration 006 — Préférences client
-- Ajoute la préférence de notifications push (toggle dans le profil client).
-- Idempotente. La policy RLS « clients: mise à jour de son profil » (002)
-- autorise déjà le propriétaire à écrire cette colonne.
-- ============================================================================

alter table clients add column if not exists push_enabled boolean not null default true;
