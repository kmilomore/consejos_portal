-- Backfill `establecimientos` with the full SLEP directory so that the FK
-- `actas.rbd -> establecimientos.rbd` never blocks an admin from creating an
-- acta for any school present in "BASE DE DATOS ESCUELAS SLEP".
--
-- Also runs the sync automatically on admin bootstrap and exposes a callable
-- RPC so the client can force a resync if a new school is added mid-session.

-- 1) Immediate backfill.
select public.sync_establecimientos_from_base_escuelas();

-- 2) Public RPC wrapper so any authenticated user (admin UI) can trigger it.
create or replace function public.ensure_establecimientos_synced()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  affected_count integer;
begin
  select public.sync_establecimientos_from_base_escuelas() into affected_count;
  return affected_count;
end;
$$;

revoke execute on function public.ensure_establecimientos_synced() from anon;
grant execute on function public.ensure_establecimientos_synced() to authenticated;
