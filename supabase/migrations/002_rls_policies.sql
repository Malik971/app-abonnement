-- ============================================================================
-- Migration 002 — Row Level Security (RLS)
-- Règles :
--   - Un commerçant ne voit que ses propres données.
--   - Un client ne voit que ses propres cartes.
--   - Les scans sont insérables par le client authentifié (ou via edge function).
--   - offline_queue est accessible sans authentification (mode hors-ligne).
--
-- Migration idempotente : chaque policy est "drop if exists" avant création
-- (Postgres ne supporte pas "create policy if not exists"), pour pouvoir
-- rejouer la migration sans erreur.
-- ============================================================================

alter table profiles          enable row level security;
alter table merchants         enable row level security;
alter table loyalty_programs  enable row level security;
alter table clients           enable row level security;
alter table loyalty_cards     enable row level security;
alter table scans             enable row level security;
alter table redeemed_rewards  enable row level security;
alter table offline_queue     enable row level security;

-- ── Helpers --------------------------------------------------------------------
-- Renvoie l'id interne du commerçant lié à l'utilisateur courant.
create or replace function current_merchant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from merchants where user_id = auth.uid() limit 1;
$$;

-- Renvoie l'id interne du client lié à l'utilisateur courant.
create or replace function current_client_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from clients where user_id = auth.uid() limit 1;
$$;

-- ── profiles -------------------------------------------------------------------
drop policy if exists "profiles: lecture de son propre profil" on profiles;
create policy "profiles: lecture de son propre profil"
  on profiles for select
  using (user_id = auth.uid());

drop policy if exists "profiles: création de son propre profil" on profiles;
create policy "profiles: création de son propre profil"
  on profiles for insert
  with check (user_id = auth.uid());

-- ── merchants ------------------------------------------------------------------
drop policy if exists "merchants: lecture de ses données" on merchants;
create policy "merchants: lecture de ses données"
  on merchants for select
  using (user_id = auth.uid());

drop policy if exists "merchants: création de son compte" on merchants;
create policy "merchants: création de son compte"
  on merchants for insert
  with check (user_id = auth.uid());

drop policy if exists "merchants: mise à jour de ses données" on merchants;
create policy "merchants: mise à jour de ses données"
  on merchants for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ── loyalty_programs -----------------------------------------------------------
-- Le commerçant gère son programme.
drop policy if exists "programs: commerçant gère son programme" on loyalty_programs;
create policy "programs: commerçant gère son programme"
  on loyalty_programs for all
  using (merchant_id = current_merchant_id())
  with check (merchant_id = current_merchant_id());

-- Lecture publique d'un programme par token QR : un client doit pouvoir
-- résoudre un QR avant d'avoir une carte. On expose la table en lecture
-- aux utilisateurs authentifiés (le token agit comme secret de jointure).
drop policy if exists "programs: lecture par client authentifié" on loyalty_programs;
create policy "programs: lecture par client authentifié"
  on loyalty_programs for select
  to authenticated
  using (true);

-- ── clients --------------------------------------------------------------------
drop policy if exists "clients: lecture de son profil" on clients;
create policy "clients: lecture de son profil"
  on clients for select
  using (user_id = auth.uid());

drop policy if exists "clients: création de son profil" on clients;
create policy "clients: création de son profil"
  on clients for insert
  with check (user_id = auth.uid());

drop policy if exists "clients: mise à jour de son profil" on clients;
create policy "clients: mise à jour de son profil"
  on clients for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Le commerçant peut lire les clients qui ont une carte chez lui (liste clients).
drop policy if exists "clients: lecture par le commerçant lié" on clients;
create policy "clients: lecture par le commerçant lié"
  on clients for select
  using (
    exists (
      select 1 from loyalty_cards lc
      where lc.client_id = clients.id
        and lc.merchant_id = current_merchant_id()
    )
  );

-- ── loyalty_cards --------------------------------------------------------------
drop policy if exists "cards: le client voit ses cartes" on loyalty_cards;
create policy "cards: le client voit ses cartes"
  on loyalty_cards for select
  using (client_id = current_client_id());

drop policy if exists "cards: le client crée ses cartes" on loyalty_cards;
create policy "cards: le client crée ses cartes"
  on loyalty_cards for insert
  with check (client_id = current_client_id());

drop policy if exists "cards: le commerçant voit les cartes de son commerce" on loyalty_cards;
create policy "cards: le commerçant voit les cartes de son commerce"
  on loyalty_cards for select
  using (merchant_id = current_merchant_id());

-- Mise à jour des points : via la fonction increment_points (security definer).
-- On autorise aussi la mise à jour directe par le client propriétaire
-- (utile pour utiliser une récompense).
drop policy if exists "cards: le client met à jour ses cartes" on loyalty_cards;
create policy "cards: le client met à jour ses cartes"
  on loyalty_cards for update
  using (client_id = current_client_id())
  with check (client_id = current_client_id());

-- ── scans ----------------------------------------------------------------------
drop policy if exists "scans: le client insère ses scans" on scans;
create policy "scans: le client insère ses scans"
  on scans for insert
  with check (client_id = current_client_id());

drop policy if exists "scans: le client lit ses scans" on scans;
create policy "scans: le client lit ses scans"
  on scans for select
  using (client_id = current_client_id());

drop policy if exists "scans: le commerçant lit les scans de son commerce" on scans;
create policy "scans: le commerçant lit les scans de son commerce"
  on scans for select
  using (merchant_id = current_merchant_id());

-- ── redeemed_rewards -----------------------------------------------------------
drop policy if exists "rewards: le client gère ses récompenses" on redeemed_rewards;
create policy "rewards: le client gère ses récompenses"
  on redeemed_rewards for all
  using (
    exists (
      select 1 from loyalty_cards lc
      where lc.id = redeemed_rewards.card_id
        and lc.client_id = current_client_id()
    )
  )
  with check (
    exists (
      select 1 from loyalty_cards lc
      where lc.id = redeemed_rewards.card_id
        and lc.client_id = current_client_id()
    )
  );

drop policy if exists "rewards: le commerçant lit les récompenses de son commerce" on redeemed_rewards;
create policy "rewards: le commerçant lit les récompenses de son commerce"
  on redeemed_rewards for select
  using (
    exists (
      select 1 from loyalty_cards lc
      where lc.id = redeemed_rewards.card_id
        and lc.merchant_id = current_merchant_id()
    )
  );

-- ── offline_queue --------------------------------------------------------------
-- Accessible sans authentification pour permettre l'enregistrement hors-ligne.
-- ATTENTION : table volontairement ouverte. Ne JAMAIS y stocker de donnée
-- sensible. Elle ne sert que de tampon de tokens QR + timestamps.
drop policy if exists "offline_queue: insertion ouverte" on offline_queue;
create policy "offline_queue: insertion ouverte"
  on offline_queue for insert
  to anon, authenticated
  with check (true);

drop policy if exists "offline_queue: lecture ouverte" on offline_queue;
create policy "offline_queue: lecture ouverte"
  on offline_queue for select
  to anon, authenticated
  using (true);

drop policy if exists "offline_queue: mise à jour ouverte (marquage synced)" on offline_queue;
create policy "offline_queue: mise à jour ouverte (marquage synced)"
  on offline_queue for update
  to anon, authenticated
  using (true)
  with check (true);
