create or replace function public.normalize_portal_email(raw_email text)
returns text
language sql
immutable
as $$
  select nullif(lower(trim(raw_email)), '');
$$;

create or replace function public.base_escuelas_normalized_rows()
returns table (
  rbd text,
  nombre text,
  direccion text,
  comuna text,
  director text,
  correo_electronico text
)
language sql
stable
set search_path = public
as $$
  select
    nullif(trim(coalesce(src.payload ->> 'RBD', src.payload ->> 'rbd', src.payload ->> 'Rbd')), '') as rbd,
    nullif(trim(coalesce(
      src.payload ->> 'NOMBRE ESTABLECIMIENTO',
      src.payload ->> 'NOMBRE',
      src.payload ->> 'nombre_establecimiento',
      src.payload ->> 'nombre',
      src.payload ->> 'ESTABLECIMIENTO EDUCATIVO',
      src.payload ->> 'establecimiento_educativo'
    )), '') as nombre,
    nullif(trim(coalesce(
      src.payload ->> 'DIRECCION',
      src.payload ->> 'DIRECCIÓN',
      src.payload ->> 'direccion',
      src.payload ->> 'dirección'
    )), '') as direccion,
    nullif(trim(coalesce(
      src.payload ->> 'COMUNA',
      src.payload ->> 'comuna',
      src.payload ->> 'CIUDAD',
      src.payload ->> 'ciudad'
    )), '') as comuna,
    nullif(trim(coalesce(
      src.payload ->> 'DIRECTOR',
      src.payload ->> 'director',
      src.payload ->> 'NOMBRE DIRECTOR',
      src.payload ->> 'nombre_director'
    )), '') as director,
    public.normalize_portal_email(coalesce(
      src.payload ->> 'CORREO ELECTRONICO',
      src.payload ->> 'CORREO ELECTRÓNICO',
      src.payload ->> 'correo_electronico',
      src.payload ->> 'correo electrónico',
      src.payload ->> 'CORREO',
      src.payload ->> 'correo',
      src.payload ->> 'EMAIL',
      src.payload ->> 'email'
    )) as correo_electronico
  from (
    select to_jsonb(base) as payload
    from public."BASE DE DATOS ESCUELAS SLEP" as base
  ) as src;
$$;

create or replace function public.sync_establecimientos_from_base_escuelas()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  affected_count integer;
begin
  insert into public.establecimientos (rbd, nombre, direccion, comuna)
  select
    rows.rbd,
    rows.nombre,
    coalesce(rows.direccion, 'Dirección no informada'),
    coalesce(rows.comuna, 'Comuna no informada')
  from public.base_escuelas_normalized_rows() as rows
  where rows.rbd is not null
    and rows.nombre is not null
  on conflict (rbd) do update
  set
    nombre = excluded.nombre,
    direccion = excluded.direccion,
    comuna = excluded.comuna,
    updated_at = now();

  get diagnostics affected_count = row_count;
  return affected_count;
end;
$$;

create or replace function public.bootstrap_current_user_profile_from_base_escuelas()
returns public.usuarios_perfiles
language plpgsql
security definer
set search_path = public
as $$
declare
  current_email text;
  matched_school record;
  synced_profile public.usuarios_perfiles;
begin
  current_email := public.normalize_portal_email(auth.jwt() ->> 'email');

  if auth.uid() is null then
    raise exception 'No hay sesión autenticada para bootstrap de perfil.';
  end if;

  if current_email is null then
    raise exception 'No se pudo determinar el correo del usuario autenticado desde el token.';
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
    id,
    correo_electronico,
    rol,
    rbd,
    comuna,
    nombre_director
  )
  values (
    auth.uid(),
    current_email,
    'DIRECTOR',
    matched_school.rbd,
    matched_school.comuna,
    matched_school.director
  )
  on conflict (id) do update
  set
    correo_electronico = excluded.correo_electronico,
    rbd = excluded.rbd,
    comuna = excluded.comuna,
    nombre_director = excluded.nombre_director,
    updated_at = now()
  returning * into synced_profile;

  return synced_profile;
end;
$$;

grant execute on function public.sync_establecimientos_from_base_escuelas() to authenticated;
grant execute on function public.bootstrap_current_user_profile_from_base_escuelas() to authenticated;