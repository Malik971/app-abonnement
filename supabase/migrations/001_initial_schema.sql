-- ============================================================================
-- Migration 001 : Tables principales
-- Application de fidélité (commerçants + clients finaux)
-- ============================================================================

-- Profil unifié : associe un utilisateur auth à un rôle (client | merchant).
-- Le rôle est figé après inscription (changement = opération manuelle).
create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  role text not null check (role in ('client', 'merchant')),
  created_at timestamptz default now()
);

-- Commerçants
create table if not exists merchants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  business_name text not null,
  business_type text,
  plan text not null default 'starter' check (plan in ('starter', 'pro', 'premium')),
  plan_expires_at timestamptz,
  stripe_customer_id text,
  stripe_subscription_id text,
  push_token text,
  active_clients_count integer default 0,
  created_at timestamptz default now()
);

-- Programmes de fidélité (un par commerçant)
create table if not exists loyalty_programs (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid references merchants(id) on delete cascade,
  points_per_visit integer not null default 1,
  rewards jsonb not null default '[]',
  -- Exemple rewards : [{"points_required": 10, "label": "Café offert"}, ...]
  qr_code_token text unique not null default gen_random_uuid()::text,
  created_at timestamptz default now()
);

-- Clients finaux
create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  first_name text,
  phone text,
  push_token text,
  created_at timestamptz default now()
);

-- Cartes de fidélité (relation client <-> programme)
create table if not exists loyalty_cards (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  program_id uuid references loyalty_programs(id) on delete cascade,
  merchant_id uuid references merchants(id) on delete cascade,
  points integer not null default 0,
  total_visits integer not null default 0,
  last_visit_at timestamptz,
  created_at timestamptz default now(),
  unique(client_id, program_id)
);

-- Scans (historique des passages)
create table if not exists scans (
  id uuid primary key default gen_random_uuid(),
  card_id uuid references loyalty_cards(id) on delete cascade,
  client_id uuid references clients(id),
  merchant_id uuid references merchants(id),
  points_earned integer not null default 1,
  synced_at timestamptz default now(),
  offline boolean default false
);

-- Récompenses débloquées
create table if not exists redeemed_rewards (
  id uuid primary key default gen_random_uuid(),
  card_id uuid references loyalty_cards(id) on delete cascade,
  reward_label text not null,
  points_spent integer not null,
  redeemed_at timestamptz default now()
);

-- Queue offline (scans en attente de sync)
create table if not exists offline_queue (
  id uuid primary key default gen_random_uuid(),
  client_id uuid,
  program_qr_token text not null,
  created_locally_at timestamptz not null,
  synced boolean default false,
  synced_at timestamptz
);

-- Index utiles aux requêtes fréquentes du dashboard / listes.
create index if not exists idx_loyalty_cards_merchant on loyalty_cards(merchant_id);
create index if not exists idx_loyalty_cards_client on loyalty_cards(client_id);
create index if not exists idx_scans_merchant_synced on scans(merchant_id, synced_at);
create index if not exists idx_scans_card on scans(card_id);
create index if not exists idx_merchants_user on merchants(user_id);
create index if not exists idx_clients_user on clients(user_id);
