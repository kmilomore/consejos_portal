-- ============================================================
-- Portal Consejos – Admin bootstrap
-- Crea tabla whitelist de admins y actualiza bootstrap para
-- crear perfiles ADMIN sin depender de BASE DE DATOS ESCUELAS SLEP.
-- ============================================================

-- Tabla de correos autorizados como administradores del portal
create table if not exists public.admin_correos (
  correo_electronico text primary key,
  nombre             text,
  created_at         timestamptz not null default now()
);

alter table public.admin_correos enable row level security;

drop policy if exists "Autenticados pueden leer admin_correos" on public.admin_correos;
create policy "Autenticados pueden leer admin_correos"
  on public.admin_correos
  for select
  to authenticated
  using (true);

-- ============================================================
-- PASO MANUAL: Insertar correos de tu equipo como admins.
-- Ejecutar en el SQL Editor de Supabase (ajusta los correos):
--
--   insert into public.admin_correos (correo_electronico, nombre)
--   select email, email
--   from auth.users
--   where email in (
--     'tuequipo@slep.cl',
--     'otro@slep.cl'
--   )
--   on conflict (correo_electronico) do nothing;
--
-- Para ver qué usuarios ya existen en auth.users:
--   select id, email, created_at from auth.users order by created_at desc;
-- ============================================================

-- ============================================================
-- Actualiza bootstrap para detectar admins antes de buscar en
-- BASE DE DATOS ESCUELAS SLEP
-- ============================================================
create or replace function public.bootstrap_current_user_profile_from_base_escuelas()
returns public.usuarios_perfiles
language plpgsql
security definer
set search_path = public
as $$
declare
  current_email  text;
  admin_record   record;
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
      updated_at        = now()
    returning * into synced_profile;

    return synced_profile;
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
    updated_at        = now()
  returning * into synced_profile;

  return synced_profile;
end;
$$;

grant execute on function public.bootstrap_current_user_profile_from_base_escuelas() to authenticated;
