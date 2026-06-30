-- ============================================================================
-- Migration 007 — Personnalisation de la carte de fidélité
-- Le commerçant peut donner une couleur, une adresse et une description à sa
-- carte (affichées côté client). Idempotente.
-- La policy RLS « merchants: mise à jour de son commerce » (002) couvre déjà
-- l'écriture de ces colonnes par le propriétaire.
-- ============================================================================

alter table merchants add column if not exists card_color text;
alter table merchants add column if not exists address text;
alter table merchants add column if not exists description text;
