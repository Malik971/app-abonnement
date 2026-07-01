-- ============================================================================
-- Migration 010 : un client peut lire les infos publiques des commerces
-- où il a une carte (nom, adresse, couleur). Nécessaire pour afficher le nom
-- du commerce dans "Mon historique" et sur les cartes du client.
-- Les requêtes client ne sélectionnent que des colonnes publiques ; les
-- identifiants Stripe ne sont jamais demandés côté client.
-- Idempotente.
-- ============================================================================

drop policy if exists "merchants: lecture par un client lié" on merchants;
create policy "merchants: lecture par un client lié"
  on merchants for select
  to authenticated
  using (
    exists (
      select 1 from loyalty_cards lc
      where lc.merchant_id = merchants.id
        and lc.client_id = current_client_id()
    )
  );
