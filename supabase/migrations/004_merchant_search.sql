-- ============================================================================
-- Migration 004 — Recherche de commerce + adhésion à un programme
--
-- Pourquoi des fonctions SECURITY DEFINER plutôt qu'une policy SELECT large ?
--   La table merchants contient des colonnes sensibles (stripe_*, push_token).
--   Une policy "select to authenticated using (true)" les exposerait toutes
--   (le RLS filtre les lignes, pas les colonnes). On expose donc uniquement les
--   champs nécessaires via des fonctions contrôlées.
-- ============================================================================

-- ── search_merchants ----------------------------------------------------------
-- Recherche par nom de commerce. Ne renvoie que des colonnes publiques.
create or replace function search_merchants(p_term text)
returns table (
  merchant_id uuid,
  business_name text,
  business_type text,
  plan text,
  active_clients_count integer,
  program_id uuid
)
language sql
stable
security definer
set search_path = public
as $$
  select m.id, m.business_name, m.business_type, m.plan, m.active_clients_count, lp.id
  from merchants m
  join loyalty_programs lp on lp.merchant_id = m.id
  where p_term <> '' and m.business_name ilike '%' || p_term || '%'
  order by m.business_name
  limit 20;
$$;

-- ── join_loyalty_program ------------------------------------------------------
-- Crée la carte de fidélité du client courant pour un commerce donné.
-- Le client est résolu via current_client_id() (on ne fait pas confiance à un
-- id passé par l'app). Applique le MUR 1 (50 clients max en starter).
-- Retourne { ok, error?, card_id?, already? }.
create or replace function join_loyalty_program(p_merchant_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client_id uuid;
  v_program   loyalty_programs%rowtype;
  v_merchant  merchants%rowtype;
  v_card      loyalty_cards%rowtype;
begin
  v_client_id := current_client_id();
  if v_client_id is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select * into v_merchant from merchants where id = p_merchant_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  select * into v_program from loyalty_programs where merchant_id = p_merchant_id limit 1;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'no_program');
  end if;

  -- Déjà membre ? (idempotent)
  select * into v_card from loyalty_cards
    where client_id = v_client_id and program_id = v_program.id;
  if found then
    return jsonb_build_object('ok', true, 'card_id', v_card.id, 'already', true);
  end if;

  -- MUR 1 : limite de 50 clients en starter.
  if v_merchant.plan = 'starter' and v_merchant.active_clients_count >= 50 then
    return jsonb_build_object('ok', false, 'error', 'merchant_full');
  end if;

  insert into loyalty_cards (client_id, program_id, merchant_id, points, total_visits)
    values (v_client_id, v_program.id, v_merchant.id, 0, 0)
    returning * into v_card;

  perform update_merchant_client_count(v_merchant.id);

  return jsonb_build_object('ok', true, 'card_id', v_card.id, 'already', false);
end;
$$;
