-- ============================================================
-- Fix: cambiar bootstrap a returns void para evitar el error
-- "Cannot coerce the result to a single JSON object" de PostgREST.
-- El cliente JS no usa el valor de retorno; solo necesita saber
-- si la llamada tuvo error o no.
-- ============================================================

drop function if exists public.bootstrap_current_user_profile_from_base_escuelas();

create or replace function public.bootstrap_current_user_profile_from_base_escuelas()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_email  text;
  admin_record   record;
  matched_school record;
  base_exists    boolean;
begin
  current_email := public.normalize_portal_email(auth.jwt() ->> 'email');

  if auth.uid() is null then
    raise exception 'No hay sesión autenticada para bootstrap de perfil.';
  end if;

  if current_email is null then
    raise exception 'No se pudo determinar el correo del usuario autenticado desde el token.';
  end if;

  -- Verificar primero si el correo está en la lista de admins
  select * into admin_record
  from public.admin_correos
  where correo_electronico = current_email
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
      coalesce(admin_record.nombre, current_email)
    )
    on conflict (id) do update set
      correo_electronico = excluded.correo_electronico,
      rol               = 'ADMIN',
      nombre_director   = excluded.nombre_director,
      updated_at        = now();

    return;
  end if;

  -- Verificar si la tabla BASE DE DATOS ESCUELAS SLEP existe
  select exists (
    select 1 from information_schema.tables
    where table_schema = 'public'
      and table_name   = 'BASE DE DATOS ESCUELAS SLEP'
  ) into base_exists;

  if not base_exists then
    raise exception 'El correo % no está autorizado como administrador y la base de escuelas SLEP aún no fue cargada.', current_email;
  end if;

  -- Flujo normal de director
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
    rbd               = excluded.rbd,
    comuna            = excluded.comuna,
    nombre_director   = excluded.nombre_director,
    updated_at        = now();
end;
$$;

grant execute on function public.bootstrap_current_user_profile_from_base_escuelas() to authenticated;
