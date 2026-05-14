create table if not exists public.usuario_establecimiento_roles (
  id uuid primary key default gen_random_uuid(),
  correo_electronico text not null,
  email_normalizado text not null,
  rbd text null references public.establecimientos(rbd) on delete cascade,
  scope_rbd_key text generated always as (coalesce(rbd, '__GLOBAL__')) stored,
  rol text not null,
  equipo text not null default '',
  origen text not null default 'manual',
  metadata jsonb not null default '{}'::jsonb,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint usuario_establecimiento_roles_correo_check check (btrim(correo_electronico) <> ''),
  constraint usuario_establecimiento_roles_email_normalizado_check check (btrim(email_normalizado) <> ''),
  constraint usuario_establecimiento_roles_rol_check check (btrim(rol) <> ''),
  constraint usuario_establecimiento_roles_origen_check check (btrim(origen) <> ''),
  constraint usuario_establecimiento_roles_scope_check check (
    (rol = 'ADMIN' and rbd is null)
    or (rol <> 'ADMIN' and rbd is not null)
  ),
  constraint usuario_establecimiento_roles_unique_scope unique (email_normalizado, scope_rbd_key, rol, equipo)
);

create index if not exists usuario_establecimiento_roles_email_idx
  on public.usuario_establecimiento_roles (email_normalizado)
  where activo = true;

create index if not exists usuario_establecimiento_roles_rbd_idx
  on public.usuario_establecimiento_roles (rbd)
  where activo = true and rbd is not null;

drop trigger if exists set_usuario_establecimiento_roles_updated_at on public.usuario_establecimiento_roles;
create trigger set_usuario_establecimiento_roles_updated_at
before update on public.usuario_establecimiento_roles
for each row execute function public.set_updated_at();

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

create or replace function public.base_escuelas_access_rows()
returns table (
  rbd text,
  nombre_establecimiento text,
  comuna text,
  director text,
  director_email text,
  representante text,
  representante_email text
)
language sql
stable
set search_path = public
as $$
  select
    nullif(trim(base."RBD"), '') as rbd,
    nullif(trim(base."NOMBRE ESTABLECIMIENTO"), '') as nombre_establecimiento,
    nullif(trim(coalesce(base."COMUNA", base."COMUNA_1")), '') as comuna,
    nullif(trim(base."DIRECTOR/A"), '') as director,
    public.normalize_portal_email(base."CORREO ELECTRÓNICO") as director_email,
    nullif(trim(base."REPRESENTANTE CONSEJO ESCOLAR"), '') as representante,
    public.normalize_portal_email(base."CORREO REPRESENTANTE") as representante_email
  from public."BASE DE DATOS ESCUELAS SLEP" as base;
$$;

create or replace function public.sync_usuario_establecimiento_roles_from_base_escuelas()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  affected_count integer := 0;
  rows_affected integer := 0;
begin
  perform public.sync_establecimientos_from_base_escuelas();

  update public.usuario_establecimiento_roles existing
  set activo = false,
      updated_at = now()
  where existing.origen = 'base_escuelas'
    and existing.rol in ('DIRECTOR', 'REPRESENTANTE')
    and not exists (
      select 1
      from public.base_escuelas_access_rows() source
      where source.rbd = existing.rbd
        and (
          (existing.rol = 'DIRECTOR' and existing.equipo = 'DIRECCION' and source.director_email = existing.email_normalizado)
          or (existing.rol = 'REPRESENTANTE' and existing.equipo = 'CONSEJO_ESCOLAR' and source.representante_email = existing.email_normalizado)
        )
    );

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
  select
    source.director_email,
    source.director_email,
    source.rbd,
    'DIRECTOR',
    'DIRECCION',
    'base_escuelas',
    jsonb_build_object(
      'nombre_establecimiento', source.nombre_establecimiento,
      'comuna', source.comuna,
      'director', source.director
    ),
    true
  from public.base_escuelas_access_rows() source
  where source.rbd is not null
    and source.director_email is not null
  on conflict (email_normalizado, scope_rbd_key, rol, equipo) do update set
    correo_electronico = excluded.correo_electronico,
    metadata = excluded.metadata,
    origen = excluded.origen,
    activo = true,
    updated_at = now();

  get diagnostics rows_affected = row_count;
  affected_count := affected_count + rows_affected;

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
  select
    source.representante_email,
    source.representante_email,
    source.rbd,
    'REPRESENTANTE',
    'CONSEJO_ESCOLAR',
    'base_escuelas',
    jsonb_build_object(
      'nombre_establecimiento', source.nombre_establecimiento,
      'comuna', source.comuna,
      'representante', source.representante
    ),
    true
  from public.base_escuelas_access_rows() source
  where source.rbd is not null
    and source.representante_email is not null
  on conflict (email_normalizado, scope_rbd_key, rol, equipo) do update set
    correo_electronico = excluded.correo_electronico,
    metadata = excluded.metadata,
    origen = excluded.origen,
    activo = true,
    updated_at = now();

  get diagnostics rows_affected = row_count;
  affected_count := affected_count + rows_affected;

  return affected_count;
end;
$$;

select public.upsert_usuario_establecimiento_rol(
  'camilo.serra@slepcolchagua.c',
  null,
  'ADMIN',
  'ADMINISTRACION',
  'manual',
  jsonb_build_object('nombre', 'Camilo Serra')
);

select public.sync_usuario_establecimiento_roles_from_base_escuelas();

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
  select exists (
    select 1
    from public.usuario_establecimiento_roles roles
    cross join current_identity
    where current_identity.correo is not null
      and roles.email_normalizado = current_identity.correo
      and roles.activo = true
      and roles.rol = 'ADMIN'
  );
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
  where public.is_global_admin()

  union

  select distinct roles.rbd
  from public.usuario_establecimiento_roles roles
  cross join current_identity
  where current_identity.correo is not null
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
    and (
      public.is_global_admin()
      or exists (
        select 1
        from public.current_accessible_rbds() scoped
        where scoped.rbd = target_rbd
      )
    );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_global_admin();
$$;

create or replace function public.get_current_portal_scope()
returns table (
  role_text text,
  is_global_admin boolean,
  accessible_rbds text[],
  default_rbd text,
  can_select_school boolean,
  landing_route text
)
language sql
stable
security definer
set search_path = public
as $$
  with current_identity as (
    select public.normalize_portal_email(auth.jwt() ->> 'email') as correo
  ),
  assigned_role as (
    select roles.rol
    from public.usuario_establecimiento_roles roles
    cross join current_identity
    where current_identity.correo is not null
      and roles.email_normalizado = current_identity.correo
      and roles.activo = true
    order by
      case
        when roles.rol = 'ADMIN' then 0
        when roles.rol = 'REPRESENTANTE' then 1
        when roles.rol = 'DIRECTOR' then 2
        else 3
      end,
      roles.rbd nulls first
    limit 1
  ),
  scope_rbds as (
    select coalesce(array_agg(scoped.rbd order by scoped.rbd), array[]::text[]) as rbds
    from public.current_accessible_rbds() scoped
  )
  select
    coalesce((select rol from assigned_role), 'DIRECTOR') as role_text,
    public.is_global_admin() as is_global_admin,
    scope_rbds.rbds as accessible_rbds,
    case
      when public.is_global_admin() then null
      when cardinality(scope_rbds.rbds) = 1 then scope_rbds.rbds[1]
      else null
    end as default_rbd,
    (public.is_global_admin() or cardinality(scope_rbds.rbds) > 1) as can_select_school,
    case
      when public.is_global_admin() or cardinality(scope_rbds.rbds) > 1 then '/admin'
      else '/resumen'
    end as landing_route
  from scope_rbds;
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

  select exists (
    select 1 from information_schema.tables
    where table_schema = 'public'
      and table_name = 'BASE DE DATOS ESCUELAS SLEP'
  ) into base_exists;

  if not base_exists then
    raise exception 'La base de escuelas SLEP aún no fue cargada.';
  end if;

  perform public.sync_usuario_establecimiento_roles_from_base_escuelas();

  if public.is_global_admin() then
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

drop policy if exists "Perfil propio o admin" on public.usuarios_perfiles;
drop policy if exists "Perfil propio o por alcance" on public.usuarios_perfiles;
create policy "Perfil propio o por alcance"
on public.usuarios_perfiles
for select
using (
  id = auth.uid()
  or public.is_global_admin()
  or (
    rbd is not null
    and public.has_school_scope_access(rbd)
  )
);

grant execute on function public.upsert_usuario_establecimiento_rol(text, text, text, text, text, jsonb) to authenticated;
grant execute on function public.sync_usuario_establecimiento_roles_from_base_escuelas() to authenticated;
grant execute on function public.is_global_admin() to authenticated;
grant execute on function public.current_accessible_rbds() to authenticated;
grant execute on function public.has_school_scope_access(text) to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.get_current_portal_scope() to authenticated;
grant execute on function public.bootstrap_current_user_profile_from_base_escuelas() to authenticated;