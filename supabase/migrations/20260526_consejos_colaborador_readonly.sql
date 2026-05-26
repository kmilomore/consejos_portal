alter table public.usuario_establecimiento_roles
  drop constraint if exists usuario_establecimiento_roles_scope_check;

alter table public.usuario_establecimiento_roles
  add constraint usuario_establecimiento_roles_scope_check check (
    ((rol = 'ADMIN' or rol = 'COLABORADOR') and rbd is null)
    or ((rol <> 'ADMIN' and rol <> 'COLABORADOR') and rbd is not null)
  );

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
  select exists (
    select 1
    from public.usuario_establecimiento_roles roles
    cross join current_identity
    where current_identity.correo is not null
      and roles.email_normalizado = current_identity.correo
      and roles.activo = true
      and roles.rol = 'COLABORADOR'
  );
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

create or replace function public.current_accessible_rbds()
returns table (rbd text)
language sql
stable
security definer
set search_path = public
as $$
  select establecimientos.rbd
  from public.establecimientos
  where public.is_global_admin() or public.has_global_readonly_access()

  union

  select distinct roles.rbd
  from public.usuario_establecimiento_roles roles
  where roles.email_normalizado = public.normalize_portal_email(auth.jwt() ->> 'email')
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
    coalesce((select rol from assigned_role), 'DIRECTOR') as role_text,
    public.is_global_admin() as is_global_admin,
    scope_rbds.rbds as accessible_rbds,
    case
      when public.is_global_admin() or public.has_global_readonly_access() then null
      when cardinality(scope_rbds.rbds) = 1 then scope_rbds.rbds[1]
      else null
    end as default_rbd,
    (public.is_global_admin() or public.has_global_readonly_access() or cardinality(scope_rbds.rbds) > 1) as can_select_school,
    case
      when public.is_global_admin() or public.has_global_readonly_access() or cardinality(scope_rbds.rbds) > 1 then '/admin'
      else '/resumen'
    end as landing_route,
    (not public.is_global_admin() and public.has_global_readonly_access()) as is_read_only,
    public.is_global_admin() as can_manage_users
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

drop policy if exists "Perfil propio o por alcance" on public.usuarios_perfiles;
drop policy if exists "Perfil propio o admin" on public.usuarios_perfiles;
create policy "Perfil propio o por alcance"
on public.usuarios_perfiles
for select
using (
  id = auth.uid()
  or public.is_global_admin()
  or public.has_global_readonly_access()
  or (
    rbd is not null
    and public.has_school_scope_access(rbd)
  )
);

drop policy if exists "Admins o rbd propio establecimientos" on public.establecimientos;
create policy "Admins o rbd propio establecimientos"
on public.establecimientos
for select
using (
  public.has_school_scope_access(rbd)
);

drop policy if exists "Gestion programacion por rbd" on public.programacion;
drop policy if exists "Leer programacion por rbd" on public.programacion;
drop policy if exists "Insert programacion por rbd" on public.programacion;
drop policy if exists "Update programacion por rbd" on public.programacion;
drop policy if exists "Delete programacion por rbd" on public.programacion;
create policy "Leer programacion por rbd"
on public.programacion
for select
using (
  public.has_school_scope_access(rbd)
);
create policy "Insert programacion por rbd"
on public.programacion
for insert
with check (
  public.has_school_write_access(rbd)
);
create policy "Update programacion por rbd"
on public.programacion
for update
using (
  public.has_school_write_access(rbd)
)
with check (
  public.has_school_write_access(rbd)
);
create policy "Delete programacion por rbd"
on public.programacion
for delete
using (
  public.has_school_write_access(rbd)
);

drop policy if exists "Gestion actas por rbd" on public.actas;
drop policy if exists "Leer actas por rbd" on public.actas;
drop policy if exists "Insert actas por rbd" on public.actas;
drop policy if exists "Update actas por rbd" on public.actas;
drop policy if exists "Delete actas por rbd" on public.actas;
create policy "Leer actas por rbd"
on public.actas
for select
using (
  public.has_school_scope_access(rbd)
);
create policy "Insert actas por rbd"
on public.actas
for insert
with check (
  public.has_school_write_access(rbd)
);
create policy "Update actas por rbd"
on public.actas
for update
using (
  public.has_school_write_access(rbd)
)
with check (
  public.has_school_write_access(rbd)
);
create policy "Delete actas por rbd"
on public.actas
for delete
using (
  public.has_school_write_access(rbd)
);

drop policy if exists "Gestion invitados por rbd" on public.actas_invitados;
drop policy if exists "Leer invitados por rbd" on public.actas_invitados;
drop policy if exists "Insert invitados por rbd" on public.actas_invitados;
drop policy if exists "Update invitados por rbd" on public.actas_invitados;
drop policy if exists "Delete invitados por rbd" on public.actas_invitados;
create policy "Leer invitados por rbd"
on public.actas_invitados
for select
using (
  exists (
    select 1
    from public.actas
    where actas.id = actas_invitados.acta_id
      and public.has_school_scope_access(actas.rbd)
  )
);
create policy "Insert invitados por rbd"
on public.actas_invitados
for insert
with check (
  exists (
    select 1
    from public.actas
    where actas.id = actas_invitados.acta_id
      and public.has_school_write_access(actas.rbd)
  )
);
create policy "Update invitados por rbd"
on public.actas_invitados
for update
using (
  exists (
    select 1
    from public.actas
    where actas.id = actas_invitados.acta_id
      and public.has_school_write_access(actas.rbd)
  )
)
with check (
  exists (
    select 1
    from public.actas
    where actas.id = actas_invitados.acta_id
      and public.has_school_write_access(actas.rbd)
  )
);
create policy "Delete invitados por rbd"
on public.actas_invitados
for delete
using (
  exists (
    select 1
    from public.actas
    where actas.id = actas_invitados.acta_id
      and public.has_school_write_access(actas.rbd)
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
  public.has_school_write_access(rbd)
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
  and public.has_school_write_access(split_part(name, '/', 1))
);

drop policy if exists "Actualizacion evidencias por rbd" on storage.objects;
create policy "Actualizacion evidencias por rbd"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'evidencias_actas'
  and public.has_school_write_access(split_part(name, '/', 1))
)
with check (
  bucket_id = 'evidencias_actas'
  and public.has_school_write_access(split_part(name, '/', 1))
);

drop policy if exists "Borrado evidencias por rbd" on storage.objects;
create policy "Borrado evidencias por rbd"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'evidencias_actas'
  and public.has_school_write_access(split_part(name, '/', 1))
);

grant execute on function public.has_global_readonly_access() to authenticated;
grant execute on function public.has_school_write_access(text) to authenticated;
grant execute on function public.current_accessible_rbds() to authenticated;
grant execute on function public.has_school_scope_access(text) to authenticated;
grant execute on function public.get_current_portal_scope() to authenticated;
grant execute on function public.bootstrap_current_user_profile_from_base_escuelas() to authenticated;