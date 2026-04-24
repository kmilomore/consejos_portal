-- ============================================================
-- Portal Consejos – acceso por representante de consejo escolar
--
-- Objetivo:
-- - permitir que correos en CORREO REPRESENTANTE entren al panel admin
-- - limitar su visibilidad solo a los RBD asociados a ese correo
-- - mantener acceso global para correos en admin_correos o admin_user_roles
-- ============================================================

create or replace function public.is_global_admin()
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  current_email text;
  has_match boolean;
  admin_roles_table_exists boolean;
begin
  current_email := public.normalize_portal_email(auth.jwt() ->> 'email');

  if current_email is null then
    return false;
  end if;

  select exists (
    select 1
    from public.admin_correos admins
    where admins.correo_electronico = current_email
  ) into has_match;

  if has_match then
    return true;
  end if;

  select to_regclass('public.admin_user_roles') is not null
  into admin_roles_table_exists;

  if not admin_roles_table_exists then
    return false;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'admin_user_roles'
      and column_name = 'correo_electronico'
  ) then
    execute 'select exists (
      select 1
      from public.admin_user_roles roles
      where lower(trim(roles.correo_electronico)) = $1
    )'
    into has_match
    using current_email;

    if has_match then
      return true;
    end if;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'admin_user_roles'
      and column_name = 'email'
  ) then
    execute 'select exists (
      select 1
      from public.admin_user_roles roles
      where lower(trim(roles.email)) = $1
    )'
    into has_match
    using current_email;

    if has_match then
      return true;
    end if;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'admin_user_roles'
      and column_name = 'correo'
  ) then
    execute 'select exists (
      select 1
      from public.admin_user_roles roles
      where lower(trim(roles.correo)) = $1
    )'
    into has_match
    using current_email;

    if has_match then
      return true;
    end if;
  end if;

  return false;
end;
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
  select distinct scoped.school_rbd as rbd
  from (
    select profile.rbd as school_rbd
    from public.usuarios_perfiles profile
    where profile.id = auth.uid()
      and profile.rbd is not null

    union all

    select nullif(trim(base."RBD"), '') as school_rbd
    from public."BASE DE DATOS ESCUELAS SLEP" as base
    cross join current_identity
    where current_identity.correo is not null
      and public.normalize_portal_email(base."CORREO REPRESENTANTE") = current_identity.correo
  ) as scoped
  where scoped.school_rbd is not null;
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

create or replace function public.bootstrap_current_user_profile_from_base_escuelas()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_email         text;
  admin_record          record;
  representative_record record;
  matched_school        record;
  base_exists           boolean;
begin
  current_email := public.normalize_portal_email(auth.jwt() ->> 'email');

  if auth.uid() is null then
    raise exception 'No hay sesión autenticada para bootstrap de perfil.';
  end if;

  if current_email is null then
    raise exception 'No se pudo determinar el correo del usuario autenticado desde el token.';
  end if;

  select * into admin_record
  from public.admin_correos
  where correo_electronico = current_email
  limit 1;

  if found or public.is_global_admin() then
    insert into public.usuarios_perfiles (
      id, correo_electronico, rol, rbd, comuna, nombre_director
    )
    values (
      auth.uid(),
      current_email,
      'ADMIN',
      null,
      null,
      coalesce(admin_record.nombre, current_email)
    )
    on conflict (id) do update set
      correo_electronico = excluded.correo_electronico,
      rol               = 'ADMIN',
      rbd               = null,
      comuna            = null,
      nombre_director   = excluded.nombre_director,
      updated_at        = now();

    return;
  end if;

  select exists (
    select 1 from information_schema.tables
    where table_schema = 'public'
      and table_name   = 'BASE DE DATOS ESCUELAS SLEP'
  ) into base_exists;

  if not base_exists then
    raise exception 'El correo % no está autorizado y la base de escuelas SLEP aún no fue cargada.', current_email;
  end if;

  select
    nullif(trim(base."REPRESENTANTE CONSEJO ESCOLAR"), '') as representante_nombre
  into representative_record
  from public."BASE DE DATOS ESCUELAS SLEP" as base
  where public.normalize_portal_email(base."CORREO REPRESENTANTE") = current_email
  order by nullif(trim(base."NOMBRE ESTABLECIMIENTO"), '') nulls last
  limit 1;

  if found then
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
      rol               = 'ADMIN',
      rbd               = null,
      comuna            = null,
      nombre_director   = excluded.nombre_director,
      updated_at        = now();

    return;
  end if;

  perform public.sync_establecimientos_from_base_escuelas();

  select *
  into matched_school
  from public.base_escuelas_normalized_rows() as rows
  where rows.correo_electronico = current_email
  order by rows.rbd
  limit 1;

  if matched_school.rbd is null then
    raise exception 'No existe una escuela asociada al correo % en BASE DE DATOS ESCUELAS SLEP.', current_email;
  end if;

  insert into public.usuarios_perfiles (
    id, correo_electronico, rol, rbd, comuna, nombre_director
  )
  values (
    auth.uid(),
    current_email,
    'DIRECTOR',
    matched_school.rbd,
    matched_school.comuna,
    matched_school.director
  )
  on conflict (id) do update set
    correo_electronico = excluded.correo_electronico,
    rol               = 'DIRECTOR',
    rbd               = excluded.rbd,
    comuna            = excluded.comuna,
    nombre_director   = excluded.nombre_director,
    updated_at        = now();
end;
$$;

drop policy if exists "Admins o rbd propio establecimientos" on public.establecimientos;
create policy "Admins o rbd propio establecimientos"
on public.establecimientos
for select
using (
  public.has_school_scope_access(rbd)
);

drop policy if exists "Perfil propio o admin" on public.usuarios_perfiles;
create policy "Perfil propio o admin"
on public.usuarios_perfiles
for select
using (
  public.is_global_admin() or id = auth.uid()
);

drop policy if exists "Gestion programacion por rbd" on public.programacion;
create policy "Gestion programacion por rbd"
on public.programacion
for all
using (
  public.has_school_scope_access(rbd)
)
with check (
  public.has_school_scope_access(rbd)
);

drop policy if exists "Gestion actas por rbd" on public.actas;
create policy "Gestion actas por rbd"
on public.actas
for all
using (
  public.has_school_scope_access(rbd)
)
with check (
  public.has_school_scope_access(rbd)
);

drop policy if exists "Gestion invitados por rbd" on public.actas_invitados;
create policy "Gestion invitados por rbd"
on public.actas_invitados
for all
using (
  exists (
    select 1
    from public.actas
    where actas.id = actas_invitados.acta_id
      and public.has_school_scope_access(actas.rbd)
  )
)
with check (
  exists (
    select 1
    from public.actas
    where actas.id = actas_invitados.acta_id
      and public.has_school_scope_access(actas.rbd)
  )
);

drop policy if exists "Logs por rbd o admin" on public.logs;
create policy "Logs por rbd o admin"
on public.logs
for select
using (
  public.has_school_scope_access(rbd)
);

drop policy if exists "Insert logs por rbd" on public.logs;
create policy "Insert logs por rbd"
on public.logs
for insert
with check (
  public.has_school_scope_access(rbd)
);

drop policy if exists "Lectura evidencias por rbd" on storage.objects;
create policy "Lectura evidencias por rbd"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'evidencias_actas'
  and public.has_school_scope_access(split_part(name, '/', 1))
);

drop policy if exists "Carga evidencias por rbd" on storage.objects;
create policy "Carga evidencias por rbd"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'evidencias_actas'
  and public.has_school_scope_access(split_part(name, '/', 1))
);

drop policy if exists "Actualizacion evidencias por rbd" on storage.objects;
create policy "Actualizacion evidencias por rbd"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'evidencias_actas'
  and public.has_school_scope_access(split_part(name, '/', 1))
)
with check (
  bucket_id = 'evidencias_actas'
  and public.has_school_scope_access(split_part(name, '/', 1))
);

drop policy if exists "Borrado evidencias por rbd" on storage.objects;
create policy "Borrado evidencias por rbd"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'evidencias_actas'
  and public.has_school_scope_access(split_part(name, '/', 1))
);

create or replace function public.get_slep_directorio()
returns table (
  rbd                    text,
  nombre_establecimiento text,
  comuna                 text,
  rural_urbano           text,
  tipo                   text,
  director               text,
  representante_consejo  text,
  correo_representante   text,
  asesor_uatp            text,
  correo_asesor          text,
  correo_electronico     text,
  latitud                text,
  longitud               text
)
language sql
security definer
stable
set search_path = public
as $$
  select
    nullif(trim(base."RBD"), '')                           as rbd,
    nullif(trim(base."NOMBRE ESTABLECIMIENTO"), '')        as nombre_establecimiento,
    nullif(trim(base."COMUNA"), '')                        as comuna,
    nullif(trim(base."RURAL/URBANO"), '')                  as rural_urbano,
    nullif(trim(base."TIPO"), '')                          as tipo,
    nullif(trim(base."DIRECTOR/A"), '')                    as director,
    nullif(trim(base."REPRESENTANTE CONSEJO ESCOLAR"), '') as representante_consejo,
    nullif(trim(base."CORREO REPRESENTANTE"), '')          as correo_representante,
    nullif(trim(base."ASESOR UATP"), '')                   as asesor_uatp,
    nullif(trim(base."CORREO ASESOR"), '')                 as correo_asesor,
    nullif(trim(base."CORREO ELECTRÓNICO"), '')            as correo_electronico,
    nullif(trim(base."LATITUD"), '')                       as latitud,
    nullif(trim(base."LONGITUD"), '')                      as longitud
  from public."BASE DE DATOS ESCUELAS SLEP" as base
  where public.is_global_admin()
    or public.has_school_scope_access(nullif(trim(base."RBD"), ''))
  order by base."COMUNA" nulls last, base."NOMBRE ESTABLECIMIENTO" nulls last;
$$;

revoke execute on function public.get_slep_directorio() from anon;
grant execute on function public.get_slep_directorio() to authenticated;
grant execute on function public.is_global_admin() to authenticated;
grant execute on function public.current_accessible_rbds() to authenticated;
grant execute on function public.has_school_scope_access(text) to authenticated;
grant execute on function public.bootstrap_current_user_profile_from_base_escuelas() to authenticated;