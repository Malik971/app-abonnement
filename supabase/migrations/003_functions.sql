-- ============================================================================
-- Migration 003 : Fonctions utilitaires
-- ============================================================================

-- ── increment_points ----------------------------------------------------------
-- Incrémente les points d'une carte de façon atomique et met à jour
-- last_visit_at + total_visits dans la même opération.
--
-- NOTE : les paramètres sont préfixés `p_` pour éviter toute ambiguïté avec
-- les colonnes `points` / `total_visits` lors de l'UPDATE (choix de
-- robustesse ; la signature métier reste « incrémente N points sur une carte »).
create or replace function increment_points(p_card_id uuid, p_points integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_total integer;
begin
  update loyalty_cards
    set points         = loyalty_cards.points + p_points,
        total_visits   = loyalty_cards.total_visits + 1,
        last_visit_at  = now()
    where id = p_card_id
    returning loyalty_cards.points into v_new_total;

  if v_new_total is null then
    raise exception 'Carte introuvable: %', p_card_id;
  end if;

  return v_new_total;
end;
$$;

-- ── update_merchant_client_count ----------------------------------------------
-- Recalcule active_clients_count à partir du nombre réel de cartes distinctes.
create or replace function update_merchant_client_count(p_merchant_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  select count(distinct client_id)
    into v_count
    from loyalty_cards
    where merchant_id = p_merchant_id;

  update merchants
    set active_clients_count = v_count
    where id = p_merchant_id;

  return v_count;
end;
$$;

-- ── sync_offline_scans --------------------------------------------------------
-- Synchronise une liste de scans enregistrés hors-ligne côté client.
-- Pour chaque (token QR, timestamp) :
--   1. résout le programme + commerçant via le token,
--   2. crée la carte si elle n'existe pas (en respectant le MUR 1 : 50 clients
--      max sur le plan starter),
--   3. crédite les points (points_per_visit du programme),
--   4. enregistre le scan (offline = true).
--
-- Retourne un jsonb : { "applied": [...], "errors": [...] }.
-- security definer : la fonction doit pouvoir mettre à jour merchants /
-- loyalty_cards au-delà des policies RLS du client.
create or replace function sync_offline_scans(
  p_client_id   uuid,
  p_qr_tokens   text[],
  p_timestamps  timestamptz[]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  i                integer;
  v_token          text;
  v_ts             timestamptz;
  v_program        loyalty_programs%rowtype;
  v_merchant       merchants%rowtype;
  v_card           loyalty_cards%rowtype;
  v_points_earned  integer;
  v_new_total      integer;
  v_is_new_card    boolean;
  v_applied        jsonb := '[]'::jsonb;
  v_errors         jsonb := '[]'::jsonb;
begin
  if array_length(p_qr_tokens, 1) is distinct from array_length(p_timestamps, 1) then
    raise exception 'Tokens et timestamps de tailles différentes';
  end if;

  if p_qr_tokens is null then
    return jsonb_build_object('applied', v_applied, 'errors', v_errors);
  end if;

  for i in 1 .. array_length(p_qr_tokens, 1) loop
    v_token := p_qr_tokens[i];
    v_ts    := p_timestamps[i];

    -- 1. Résolution du programme.
    select * into v_program from loyalty_programs where qr_code_token = v_token;
    if not found then
      v_errors := v_errors || jsonb_build_object('token', v_token, 'error', 'invalid_qr');
      continue;
    end if;

    select * into v_merchant from merchants where id = v_program.merchant_id;

    -- 2. Carte existante ?
    select * into v_card
      from loyalty_cards
      where client_id = p_client_id and program_id = v_program.id;

    v_is_new_card := not found;

    if v_is_new_card then
      -- MUR 1 : limite de 50 clients sur le plan starter.
      if v_merchant.plan = 'starter' and v_merchant.active_clients_count >= 50 then
        v_errors := v_errors || jsonb_build_object('token', v_token, 'error', 'merchant_full');
        continue;
      end if;

      insert into loyalty_cards (client_id, program_id, merchant_id, points, total_visits)
        values (p_client_id, v_program.id, v_merchant.id, 0, 0)
        returning * into v_card;
    end if;

    -- 3. Crédit des points (atomique via increment_points).
    v_points_earned := v_program.points_per_visit;
    v_new_total := increment_points(v_card.id, v_points_earned);

    -- 4. Trace du scan.
    insert into scans (card_id, client_id, merchant_id, points_earned, synced_at, offline)
      values (v_card.id, p_client_id, v_merchant.id, v_points_earned, v_ts, true);

    -- Recalcule le compteur de clients si nouvelle carte.
    if v_is_new_card then
      perform update_merchant_client_count(v_merchant.id);
    end if;

    v_applied := v_applied || jsonb_build_object(
      'token', v_token,
      'card_id', v_card.id,
      'points_earned', v_points_earned,
      'new_total', v_new_total,
      'business_name', v_merchant.business_name
    );
  end loop;

  return jsonb_build_object('applied', v_applied, 'errors', v_errors);
end;
$$;

-- ── delete_client_data (RGPD) -------------------------------------------------
-- Anonymise un client : efface les données personnelles, met client_id à null
-- sur les scans (on garde les stats commerçant), supprime cartes & récompenses.
create or replace function delete_client_data(p_client_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Anonymise l'historique des scans (conserve les stats commerçant).
  update scans set client_id = null where client_id = p_client_id;

  -- Supprime les cartes et récompenses (cascade sur redeemed_rewards).
  delete from loyalty_cards where client_id = p_client_id;

  -- Efface les données personnelles du client.
  update clients
    set first_name = null,
        phone = null,
        push_token = null
    where id = p_client_id;
end;
$$;
