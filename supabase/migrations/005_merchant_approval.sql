-- ============================================================================
-- Migration 005 : Validation manuelle des commerçants
-- Ajoute un statut d'approbation entre l'inscription et l'activation du compte.
-- Idempotente.
-- ============================================================================

alter table merchants add column if not exists approval_status text not null default 'pending'
  check (approval_status in ('pending', 'approved', 'rejected'));

alter table merchants add column if not exists approved_at timestamptz;
alter table merchants add column if not exists rejection_reason text;

-- Index pour les requêtes admin (filtrer par statut).
create index if not exists idx_merchants_approval_status on merchants(approval_status);

-- ── Anti-fraude : un commerçant ne peut PAS s'auto-valider ───────────────────
-- Les colonnes d'approbation ne sont modifiables que par le service_role
-- (edge functions approve-merchant / reject-merchant). À l'inscription, le
-- statut est forcé à 'pending' quelles que soient les valeurs envoyées.
create or replace function enforce_merchant_approval_guard()
returns trigger
language plpgsql
as $$
begin
  -- auth.role() = 'service_role' pour les appels avec la clé service (edge functions).
  if auth.role() is distinct from 'service_role' then
    if tg_op = 'INSERT' then
      new.approval_status := 'pending';
      new.approved_at := null;
      new.rejection_reason := null;
    elsif tg_op = 'UPDATE' then
      if new.approval_status is distinct from old.approval_status
        or new.approved_at is distinct from old.approved_at
        or new.rejection_reason is distinct from old.rejection_reason then
        raise exception 'Les colonnes d''approbation sont en lecture seule (service_role requis).';
      end if;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_merchant_approval_guard on merchants;
create trigger trg_merchant_approval_guard
  before insert or update on merchants
  for each row execute function enforce_merchant_approval_guard();
