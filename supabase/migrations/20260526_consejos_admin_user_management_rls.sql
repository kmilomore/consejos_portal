create or replace function public.upsert_usuario_establecimiento_rol(
  p_correo_electronico text,
  p_rbd text,
  p_rol text,
  p_equipo text default '',
  p_origen text default 'manual',
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_email text;
  normalized_rbd text;
  normalized_role text;
  normalized_team text;
  normalized_source text;
begin
  if not public.is_global_admin() then
    raise exception 'Solo un administrador global puede gestionar accesos de usuarios.';
  end if;

  normalized_email := public.normalize_portal_email(p_correo_electronico);
  normalized_rbd := nullif(trim(p_rbd), '');
  normalized_role := upper(nullif(trim(p_rol), ''));
  normalized_team := upper(trim(coalesce(p_equipo, '')));
  normalized_source := lower(coalesce(nullif(trim(p_origen), ''), 'manual'));

  if normalized_email is null then
    raise exception 'Se requiere un correo valido para registrar el acceso.';
  end if;

  if normalized_role is null then
    raise exception 'Se requiere un rol valido para registrar el acceso.';
  end if;

  if normalized_role = 'ADMIN' then
    normalized_rbd := null;
  elsif normalized_rbd is null then
    raise exception 'Se requiere un RBD valido para roles no globales.';
  end if;

  insert into public.usuario_establecimiento_roles (
    correo_electronico,
    email_normalizado,
    rbd,
    rol,
    equipo,
    origen,
    metadata,
    activo
  )
  values (
    trim(p_correo_electronico),
    normalized_email,
    normalized_rbd,
    normalized_role,
    normalized_team,
    normalized_source,
    coalesce(p_metadata, '{}'::jsonb),
    true
  )
  on conflict (email_normalizado, scope_rbd_key, rol, equipo) do update set
    correo_electronico = excluded.correo_electronico,
    origen = excluded.origen,
    metadata = case
      when excluded.metadata = '{}'::jsonb then public.usuario_establecimiento_roles.metadata
      else excluded.metadata
    end,
    activo = true,
    updated_at = now();
end;
$$;

alter table public.usuario_establecimiento_roles enable row level security;

drop policy if exists "Admin global gestiona accesos de usuarios" on public.usuario_establecimiento_roles;
create policy "Admin global gestiona accesos de usuarios"
on public.usuario_establecimiento_roles
for all
using (public.is_global_admin())
with check (public.is_global_admin());

grant execute on function public.upsert_usuario_establecimiento_rol(text, text, text, text, text, jsonb) to authenticated;