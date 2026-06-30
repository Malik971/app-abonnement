-- ============================================================================
-- Migration 009 : objectifs commerçant et coordonnées
-- Regroupe les ajouts de schéma du chantier "tableau de bord".
-- Les colonnes card_color et address ont déjà été créées par la migration 007 ;
-- on les re-déclare en "if not exists" pour rester idempotent quel que soit
-- l'historique d'application des migrations.
-- ============================================================================

-- Personnalisation visuelle (déjà en 007, gardé ici par sécurité).
alter table merchants add column if not exists card_color text;
alter table merchants add column if not exists address text;

-- Objectifs affichés dans les anneaux de progression du tableau de bord.
alter table merchants add column if not exists goal_clients integer not null default 50;
alter table merchants add column if not exists goal_daily_scans integer not null default 10;

-- Lien public du commerce (site web ou page Google Maps), optionnel.
alter table merchants add column if not exists website text;
