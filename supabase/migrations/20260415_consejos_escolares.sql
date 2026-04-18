create extension if not exists "pgcrypto";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum ('ADMIN', 'DIRECTOR');
  end if;

  if not exists (select 1 from pg_type where typname = 'session_type') then
    create type public.session_type as enum ('Ordinaria', 'Extraordinaria');
  end if;

  if not exists (select 1 from pg_type where typname = 'session_format') then
    create type public.session_format as enum ('Presencial', 'Online', 'Híbrido');
  end if;

  if not exists (select 1 from pg_type where typname = 'planning_status') then
    create type public.planning_status as enum ('PROGRAMADA', 'REALIZADA', 'CANCELADA');
  end if;

  if not exists (select 1 from pg_type where typname = 'log_action') then
    create type public.log_action as enum ('CREAR_ACTA', 'EDITAR_ACTA', 'ELIMINAR_ACTA', 'LOGIN');
  end if;
end $$;

create table if not exists public.establecimientos (
  rbd text primary key,
  nombre text not null,
  direccion text not null,
  comuna text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.usuarios_perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  correo_electronico text not null unique,
  rol public.user_role not null default 'DIRECTOR',
  rbd text references public.establecimientos(rbd),
  comuna text,
  nombre_director text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.programacion (
  id uuid primary key default gen_random_uuid(),
  rbd text not null references public.establecimientos(rbd) on delete cascade,
  tipo_sesion public.session_type not null,
  numero_sesion integer not null check (numero_sesion > 0),
  fecha_programada date not null,
  hora_programada time not null,
  formato_planeado public.session_format not null,
  lugar_tentativo text not null,
  tematicas text not null,
  estado public.planning_status not null default 'PROGRAMADA',
  acta_vinculada_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (rbd, tipo_sesion, numero_sesion, fecha_programada)
);

create table if not exists public.actas (
  id uuid primary key default gen_random_uuid(),
  programacion_origen_id uuid references public.programacion(id) on delete set null,
  rbd text not null references public.establecimientos(rbd) on delete cascade,
  sesion integer not null check (sesion > 0),
  tipo_sesion public.session_type not null,
  formato public.session_format not null,
  fecha date not null,
  hora_inicio time not null,
  hora_termino time not null,
  lugar text not null,
  comuna text not null,
  direccion text not null,
  tabla_temas text not null,
  desarrollo text not null,
  acuerdos text not null,
  varios text not null,
  proxima_sesion date,
  link_acta text,
  asistentes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (rbd, tipo_sesion, sesion)
);

alter table public.programacion
  drop constraint if exists programacion_acta_vinculada_fk;

alter table public.programacion
  add constraint programacion_acta_vinculada_fk
  foreign key (acta_vinculada_id)
  references public.actas(id)
  on delete set null;

create table if not exists public.actas_invitados (
  id uuid primary key default gen_random_uuid(),
  acta_id uuid not null references public.actas(id) on delete cascade,
  nombre text not null,
  cargo text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.logs (
  id uuid primary key default gen_random_uuid(),
  usuario text not null,
  rbd text not null,
  accion public.log_action not null,
  detalle text not null,
  vista_origen text not null,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_establecimientos_updated_at on public.establecimientos;
create trigger set_establecimientos_updated_at
before update on public.establecimientos
for each row execute function public.set_updated_at();

drop trigger if exists set_usuarios_perfiles_updated_at on public.usuarios_perfiles;
create trigger set_usuarios_perfiles_updated_at
before update on public.usuarios_perfiles
for each row execute function public.set_updated_at();

drop trigger if exists set_programacion_updated_at on public.programacion;
create trigger set_programacion_updated_at
before update on public.programacion
for each row execute function public.set_updated_at();

drop trigger if exists set_actas_updated_at on public.actas;
create trigger set_actas_updated_at
before update on public.actas
for each row execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.usuarios_perfiles profile
    where profile.id = auth.uid()
      and profile.rol = 'ADMIN'
  );
$$;

create or replace function public.current_user_rbd()
returns text
language sql
stable
as $$
  select profile.rbd
  from public.usuarios_perfiles profile
  where profile.id = auth.uid();
$$;

create or replace function public.get_next_session_number(
  session_type public.session_type,
  establishment_rbd text,
  target_year integer default extract(year from now())::integer
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  max_programacion integer;
  max_actas integer;
  combined integer;
  ordinary_count integer;
begin
  select coalesce(max(numero_sesion), 0)
  into max_programacion
  from public.programacion
  where rbd = establishment_rbd
    and tipo_sesion = session_type
    and extract(year from fecha_programada) = target_year;

  select coalesce(max(sesion), 0)
  into max_actas
  from public.actas
  where rbd = establishment_rbd
    and tipo_sesion = session_type
    and extract(year from fecha) = target_year;

  if session_type = 'Ordinaria' then
    select (
      select count(*)
      from public.programacion
      where rbd = establishment_rbd
        and tipo_sesion = 'Ordinaria'
        and extract(year from fecha_programada) = target_year
    ) + (
      select count(*)
      from public.actas
      where rbd = establishment_rbd
        and tipo_sesion = 'Ordinaria'
        and extract(year from fecha) = target_year
    )
    into ordinary_count;
  else
    ordinary_count := 0;
  end if;

  if session_type = 'Ordinaria' and ordinary_count >= 4 then
    raise exception 'No se permiten más de 4 sesiones ordinarias para el RBD % en el año %', establishment_rbd, target_year;
  end if;

  combined := greatest(coalesce(max_programacion, 0), coalesce(max_actas, 0));
  return combined + 1;
end;
$$;

alter table public.establecimientos enable row level security;
alter table public.usuarios_perfiles enable row level security;
alter table public.programacion enable row level security;
alter table public.actas enable row level security;
alter table public.actas_invitados enable row level security;
alter table public.logs enable row level security;

drop policy if exists "Admins o rbd propio establecimientos" on public.establecimientos;
create policy "Admins o rbd propio establecimientos"
on public.establecimientos
for select
using (
  public.is_admin() or rbd = public.current_user_rbd()
);

drop policy if exists "Perfil propio o admin" on public.usuarios_perfiles;
create policy "Perfil propio o admin"
on public.usuarios_perfiles
for select
using (
  public.is_admin() or id = auth.uid()
);

drop policy if exists "Gestion programacion por rbd" on public.programacion;
create policy "Gestion programacion por rbd"
on public.programacion
for all
using (
  public.is_admin() or rbd = public.current_user_rbd()
)
with check (
  public.is_admin() or rbd = public.current_user_rbd()
);

drop policy if exists "Gestion actas por rbd" on public.actas;
create policy "Gestion actas por rbd"
on public.actas
for all
using (
  public.is_admin() or rbd = public.current_user_rbd()
)
with check (
  public.is_admin() or rbd = public.current_user_rbd()
);

drop policy if exists "Gestion invitados por rbd" on public.actas_invitados;
create policy "Gestion invitados por rbd"
on public.actas_invitados
for all
using (
  public.is_admin() or exists (
    select 1
    from public.actas
    where actas.id = actas_invitados.acta_id
      and actas.rbd = public.current_user_rbd()
  )
)
with check (
  public.is_admin() or exists (
    select 1
    from public.actas
    where actas.id = actas_invitados.acta_id
      and actas.rbd = public.current_user_rbd()
  )
);

drop policy if exists "Logs por rbd o admin" on public.logs;
create policy "Logs por rbd o admin"
on public.logs
for select
using (
  public.is_admin() or rbd = public.current_user_rbd()
);

drop policy if exists "Insert logs por rbd" on public.logs;
create policy "Insert logs por rbd"
on public.logs
for insert
with check (
  public.is_admin() or rbd = public.current_user_rbd()
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'evidencias_actas',
  'evidencias_actas',
  false,
  10485760,
  array['application/pdf']
)
on conflict (id) do nothing;

drop policy if exists "Lectura evidencias por rbd" on storage.objects;
create policy "Lectura evidencias por rbd"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'evidencias_actas'
  and (
    public.is_admin()
    or split_part(name, '/', 1) = public.current_user_rbd()
  )
);

drop policy if exists "Carga evidencias por rbd" on storage.objects;
create policy "Carga evidencias por rbd"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'evidencias_actas'
  and (
    public.is_admin()
    or split_part(name, '/', 1) = public.current_user_rbd()
  )
);

drop policy if exists "Actualizacion evidencias por rbd" on storage.objects;
create policy "Actualizacion evidencias por rbd"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'evidencias_actas'
  and (
    public.is_admin()
    or split_part(name, '/', 1) = public.current_user_rbd()
  )
)
with check (
  bucket_id = 'evidencias_actas'
  and (
    public.is_admin()
    or split_part(name, '/', 1) = public.current_user_rbd()
  )
);

drop policy if exists "Borrado evidencias por rbd" on storage.objects;
create policy "Borrado evidencias por rbd"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'evidencias_actas'
  and (
    public.is_admin()
    or split_part(name, '/', 1) = public.current_user_rbd()
  )
);