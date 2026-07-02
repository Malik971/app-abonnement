-- ============================================================================
-- Migration 012 : outils de données de test (DEV)
-- Fonctions SECURITY DEFINER pour injecter / vider des données fictives, afin de
-- visualiser les statistiques du tableau de bord. Réservées au commerçant
-- propriétaire (vérification auth.uid()). Les clients de test ont user_id NULL
-- et un prénom préfixé « Test ».
--
-- Appelées uniquement depuis des boutons visibles en mode développement.
-- Idempotente (create or replace).
-- ============================================================================

create or replace function seed_test_data(p_merchant_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_program uuid;
  v_client uuid;
  v_card uuid;
  v_names text[] := array['Test Alex', 'Test Marie', 'Test Jean', 'Test Luna', 'Test Sam', 'Test Nour'];
  i int;
  j int;
  v_scans int;
  v_when timestamptz;
begin
  -- Sécurité : seul le propriétaire du commerce peut injecter des données.
  if not exists (select 1 from merchants where id = p_merchant_id and user_id = auth.uid()) then
    raise exception 'Accès refusé';
  end if;

  select id into v_program from loyalty_programs where merchant_id = p_merchant_id limit 1;
  if v_program is null then
    return;
  end if;

  for i in 1 .. array_length(v_names, 1) loop
    insert into clients (user_id, first_name) values (null, v_names[i]) returning id into v_client;
    insert into loyalty_cards (client_id, program_id, merchant_id, points, total_visits)
      values (v_client, v_program, p_merchant_id, 0, 0)
      returning id into v_card;

    -- Entre 3 et 14 passages répartis sur les 30 derniers jours.
    v_scans := 3 + floor(random() * 12)::int;
    for j in 1 .. v_scans loop
      v_when := now()
        - ((floor(random() * 30))::text || ' days')::interval
        - ((floor(random() * 12))::text || ' hours')::interval;
      insert into scans (card_id, client_id, merchant_id, points_earned, synced_at)
        values (v_card, v_client, p_merchant_id, 1, v_when);
    end loop;

    update loyalty_cards
      set points = v_scans,
          total_visits = v_scans,
          last_visit_at = (select max(synced_at) from scans where card_id = v_card)
      where id = v_card;

    -- Deux « clients fidèles » (3 récompenses obtenues) pour tester le badge.
    if i <= 2 then
      insert into redeemed_rewards (card_id, reward_label, points_spent)
        select v_card, 'Récompense test', 10 from generate_series(1, 3);
    end if;
  end loop;

  perform update_merchant_client_count(p_merchant_id);
end;
$$;

create or replace function clear_test_data(p_merchant_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from merchants where id = p_merchant_id and user_id = auth.uid()) then
    raise exception 'Accès refusé';
  end if;

  -- Supprime les cartes de test (les scans et récompenses suivent en cascade).
  delete from loyalty_cards
    where merchant_id = p_merchant_id
      and client_id in (select id from clients where user_id is null and first_name like 'Test %');

  -- Supprime les clients de test devenus orphelins.
  delete from clients c
    where c.user_id is null
      and c.first_name like 'Test %'
      and not exists (select 1 from loyalty_cards lc where lc.client_id = c.id);

  perform update_merchant_client_count(p_merchant_id);
end;
$$;

grant execute on function seed_test_data(uuid) to authenticated;
grant execute on function clear_test_data(uuid) to authenticated;
