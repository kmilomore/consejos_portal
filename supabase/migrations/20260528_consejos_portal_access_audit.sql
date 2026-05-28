create table if not exists public.portal_access_audit (
  id uuid primary key default gen_random_uuid(),
  access_id uuid not null references public.usuario_establecimiento_roles(id) on delete cascade,
  admin_email text not null,
  accion text not null,
  snapshot_antes jsonb null,
  snapshot_despues jsonb null,
  created_at timestamptz not null default now(),
  constraint portal_access_audit_action_check check (accion in ('CREADO', 'ACTUALIZADO', 'DESACTIVADO'))
);

create index if not exists portal_access_audit_created_at_idx
  on public.portal_access_audit (created_at desc);

create index if not exists portal_access_audit_access_id_idx
  on public.portal_access_audit (access_id);

create or replace function public.log_portal_access_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved_admin_email text;
  resolved_action text;
begin
  resolved_admin_email := lower(coalesce(nullif(auth.jwt() ->> 'email', ''), 'system'));

  if tg_op = 'INSERT' then
    resolved_action := 'CREADO';
  elsif coalesce(old.activo, true) = true and new.activo = false then
    resolved_action := 'DESACTIVADO';
  else
    resolved_action := 'ACTUALIZADO';
  end if;

  insert into public.portal_access_audit (
    access_id,
    admin_email,
    accion,
    snapshot_antes,
    snapshot_despues
  )
  values (
    coalesce(new.id, old.id),
    resolved_admin_email,
    resolved_action,
    case
      when tg_op = 'INSERT' then null
      else jsonb_build_object(
        'correo_electronico', old.correo_electronico,
        'email_normalizado', old.email_normalizado,
        'rbd', old.rbd,
        'rol', old.rol,
        'equipo', old.equipo,
        'origen', old.origen,
        'metadata', old.metadata,
        'activo', old.activo
      )
    end,
    jsonb_build_object(
      'correo_electronico', new.correo_electronico,
      'email_normalizado', new.email_normalizado,
      'rbd', new.rbd,
      'rol', new.rol,
      'equipo', new.equipo,
      'origen', new.origen,
      'metadata', new.metadata,
      'activo', new.activo
    )
  );

  return coalesce(new, old);
end;
$$;

drop trigger if exists portal_access_audit_trigger on public.usuario_establecimiento_roles;
create trigger portal_access_audit_trigger
after insert or update on public.usuario_establecimiento_roles
for each row execute function public.log_portal_access_change();

alter table public.portal_access_audit enable row level security;

drop policy if exists "Admin global ve auditoria de accesos" on public.portal_access_audit;
create policy "Admin global ve auditoria de accesos"
on public.portal_access_audit
for select
to authenticated
using (public.is_global_admin());