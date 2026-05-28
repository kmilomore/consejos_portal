create or replace function public.portal_allowed_email_domain()
returns text
language sql
stable
set search_path = public
as $$
  select coalesce(
    nullif(regexp_replace(lower(trim(coalesce(current_setting('app.settings.portal_allowed_email_domain', true), ''))), '^@+', ''), ''),
    'slepcolchagua.cl'
  );
$$;

create or replace function public.is_portal_allowed_email(candidate_email text default auth.jwt() ->> 'email')
returns boolean
language sql
stable
set search_path = public
as $$
  with normalized as (
    select public.normalize_portal_email(candidate_email) as correo
  )
  select
    normalized.correo is not null
    and split_part(normalized.correo, '@', 2) = public.portal_allowed_email_domain()
  from normalized;
$$;

create or replace function public.is_global_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with current_identity as (
    select public.normalize_portal_email(auth.jwt() ->> 'email') as correo
  )
  select
    current_identity.correo is not null
    and public.is_portal_allowed_email(current_identity.correo)
    and exists (
      select 1
      from public.usuario_establecimiento_roles roles
      where roles.email_normalizado = current_identity.correo
        and roles.activo = true
        and roles.rol = 'ADMIN'
    )
  from current_identity;
$$;

create or replace function public.has_global_readonly_access()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with current_identity as (
    select public.normalize_portal_email(auth.jwt() ->> 'email') as correo
  )
  select
    current_identity.correo is not null
    and public.is_portal_allowed_email(current_identity.correo)
    and exists (
      select 1
      from public.usuario_establecimiento_roles roles
      where roles.email_normalizado = current_identity.correo
        and roles.activo = true
        and roles.rol = 'COLABORADOR'
    )
  from current_identity;
$$;

create or replace function public.current_accessible_rbds()
returns table (rbd text)
language sql
stable
security definer
set search_path = public
as $$
  with current_identity as (
    select public.normalize_portal_email(auth.jwt() ->> 'email') as correo
  )
  select establecimientos.rbd
  from public.establecimientos
  cross join current_identity
  where current_identity.correo is not null
    and public.is_portal_allowed_email(current_identity.correo)
    and (public.is_global_admin() or public.has_global_readonly_access())

  union

  select distinct roles.rbd
  from public.usuario_establecimiento_roles roles
  cross join current_identity
  where current_identity.correo is not null
    and public.is_portal_allowed_email(current_identity.correo)
    and roles.email_normalizado = current_identity.correo
    and roles.activo = true
    and roles.rbd is not null;
$$;

create or replace function public.has_school_scope_access(target_rbd text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    target_rbd is not null
    and public.is_portal_allowed_email()
    and (
      public.is_global_admin()
      or public.has_global_readonly_access()
      or exists (
        select 1
        from public.current_accessible_rbds() scoped
        where scoped.rbd = target_rbd
      )
    );
$$;

create or replace function public.has_school_write_access(target_rbd text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    target_rbd is not null
    and public.is_portal_allowed_email()
    and (
      public.is_global_admin()
      or exists (
        select 1
        from public.usuario_establecimiento_roles roles
        where roles.email_normalizado = public.normalize_portal_email(auth.jwt() ->> 'email')
          and roles.activo = true
          and roles.rbd = target_rbd
          and roles.rol in ('DIRECTOR', 'REPRESENTANTE')
      )
    );
$$;

drop function if exists public.get_current_portal_scope();

create or replace function public.get_current_portal_scope()
returns table (
  role_text text,
  is_global_admin boolean,
  accessible_rbds text[],
  default_rbd text,
  can_select_school boolean,
  landing_route text,
  is_read_only boolean,
  can_manage_users boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with current_identity as (
    select
      public.normalize_portal_email(auth.jwt() ->> 'email') as correo,
      public.is_portal_allowed_email() as email_allowed
  ),
  assigned_role as (
    select roles.rol
    from public.usuario_establecimiento_roles roles
    cross join current_identity
    where current_identity.email_allowed
      and current_identity.correo is not null
      and roles.email_normalizado = current_identity.correo
      and roles.activo = true
    order by
      case
        when roles.rol = 'ADMIN' then 0
        when roles.rol = 'COLABORADOR' then 1
        when roles.rol = 'REPRESENTANTE' then 2
        when roles.rol = 'DIRECTOR' then 3
        else 4
      end,
      roles.rbd nulls first
    limit 1
  ),
  scope_rbds as (
    select coalesce(array_agg(scoped.rbd order by scoped.rbd), array[]::text[]) as rbds
    from public.current_accessible_rbds() scoped
  )
  select
    case
      when not current_identity.email_allowed then 'DENIED'
      else coalesce((select rol from assigned_role), 'DIRECTOR')
    end as role_text,
    public.is_global_admin() as is_global_admin,
    case when current_identity.email_allowed then scope_rbds.rbds else array[]::text[] end as accessible_rbds,
    case
      when not current_identity.email_allowed then null
      when public.is_global_admin() or public.has_global_readonly_access() then null
      when cardinality(scope_rbds.rbds) = 1 then scope_rbds.rbds[1]
      else null
    end as default_rbd,
    case
      when not current_identity.email_allowed then false
      else (public.is_global_admin() or public.has_global_readonly_access() or cardinality(scope_rbds.rbds) > 1)
    end as can_select_school,
    case
      when not current_identity.email_allowed then '/resumen'
      when public.is_global_admin() or public.has_global_readonly_access() or cardinality(scope_rbds.rbds) > 1 then '/admin'
      else '/resumen'
    end as landing_route,
    case
      when not current_identity.email_allowed then false
      else (not public.is_global_admin() and public.has_global_readonly_access())
    end as is_read_only,
    case
      when not current_identity.email_allowed then false
      else public.is_global_admin()
    end as can_manage_users
  from current_identity
  cross join scope_rbds;
$$;

create or replace function public.bootstrap_current_user_profile_from_base_escuelas()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_email text;
  representative_record record;
  director_record record;
  base_exists boolean;
begin
  current_email := public.normalize_portal_email(auth.jwt() ->> 'email');

  if auth.uid() is null then
    raise exception 'No hay sesión autenticada para bootstrap de perfil.';
  end if;

  if current_email is null then
    raise exception 'No se pudo determinar el correo del usuario autenticado desde el token.';
  end if;

  if not public.is_portal_allowed_email(current_email) then
    raise exception 'El correo % no pertenece al dominio institucional permitido para este portal.', current_email;
  end if;

  select exists (
    select 1 from information_schema.tables
    where table_schema = 'public'
      and table_name = 'BASE DE DATOS ESCUELAS SLEP'
  ) into base_exists;

  if not base_exists then
    raise exception 'La base de escuelas SLEP aún no fue cargada.';
  end if;

  perform public.sync_usuario_establecimiento_roles_from_base_escuelas();

  if public.is_global_admin() or public.has_global_readonly_access() then
    insert into public.usuarios_perfiles (
      id, correo_electronico, rol, rbd, comuna, nombre_director
    )
    values (
      auth.uid(),
      current_email,
      'ADMIN',
      null,
      null,
      current_email
    )
    on conflict (id) do update set
      correo_electronico = excluded.correo_electronico,
      rol = 'ADMIN',
      rbd = null,
      comuna = null,
      nombre_director = excluded.nombre_director,
      updated_at = now();

    return;
  end if;

  select
    roles.rbd,
    roles.metadata ->> 'representante' as representante_nombre
  into representative_record
  from public.usuario_establecimiento_roles roles
  where roles.email_normalizado = current_email
    and roles.activo = true
    and roles.rol = 'REPRESENTANTE'
    and roles.equipo = 'CONSEJO_ESCOLAR'
  order by roles.rbd
  limit 1;

  if representative_record.rbd is not null then
    insert into public.usuarios_perfiles (
      id, correo_electronico, rol, rbd, comuna, nombre_director
    )
    values (
      auth.uid(),
      current_email,
      'ADMIN',
      null,
      null,
      coalesce(representative_record.representante_nombre, current_email)
    )
    on conflict (id) do update set
      correo_electronico = excluded.correo_electronico,
      rol = 'ADMIN',
      rbd = null,
      comuna = null,
      nombre_director = excluded.nombre_director,
      updated_at = now();

    return;
  end if;

  select
    roles.rbd,
    roles.metadata ->> 'comuna' as comuna,
    roles.metadata ->> 'director' as director
  into director_record
  from public.usuario_establecimiento_roles roles
  where roles.email_normalizado = current_email
    and roles.activo = true
    and roles.rol = 'DIRECTOR'
    and roles.equipo = 'DIRECCION'
  order by roles.rbd
  limit 1;

  if director_record.rbd is null then
    raise exception 'No existe una escuela asociada al correo % en BASE DE DATOS ESCUELAS SLEP.', current_email;
  end if;

  insert into public.usuarios_perfiles (
    id, correo_electronico, rol, rbd, comuna, nombre_director
  )
  values (
    auth.uid(),
    current_email,
    'DIRECTOR',
    director_record.rbd,
    director_record.comuna,
    director_record.director
  )
  on conflict (id) do update set
    correo_electronico = excluded.correo_electronico,
    rol = 'DIRECTOR',
    rbd = excluded.rbd,
    comuna = excluded.comuna,
    nombre_director = excluded.nombre_director,
    updated_at = now();
end;
$$;

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

  if not public.is_portal_allowed_email(normalized_email) then
    raise exception 'Solo se permiten correos del dominio institucional configurado.';
  end if;

  if normalized_role is null then
    raise exception 'Se requiere un rol valido para registrar el acceso.';
  end if;

  if normalized_role in ('ADMIN', 'COLABORADOR') then
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

drop policy if exists "Lectura publica establecimientos" on public.establecimientos;
drop policy if exists "Lectura publica programacion" on public.programacion;
drop policy if exists "Lectura publica actas" on public.actas;
drop policy if exists "Lectura publica invitados actas" on public.actas_invitados;

grant execute on function public.portal_allowed_email_domain() to authenticated;
grant execute on function public.is_portal_allowed_email(text) to authenticated;
