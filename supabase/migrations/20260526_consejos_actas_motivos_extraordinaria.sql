create table if not exists public.motivos_sesion_extraordinaria (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint motivos_sesion_extraordinaria_nombre_not_blank check (btrim(nombre) <> '')
);

create unique index if not exists motivos_sesion_extraordinaria_nombre_ci_idx
on public.motivos_sesion_extraordinaria ((lower(btrim(nombre))));

drop trigger if exists set_motivos_sesion_extraordinaria_updated_at on public.motivos_sesion_extraordinaria;
create trigger set_motivos_sesion_extraordinaria_updated_at
before update on public.motivos_sesion_extraordinaria
for each row execute function public.set_updated_at();

insert into public.motivos_sesion_extraordinaria (nombre)
select item.nombre
from (
  values
    ('Suspensión de clases'),
    ('Revisión y modificación al reglamento interno'),
    ('Actualización de protocolo de actuación'),
    ('Subsanación de observaciones de SIE'),
    ('Subsanación de observaciones de Salud'),
    ('Proyectos de conservación'),
    ('Cuenta Pública'),
    ('Cierre de año escolar'),
    ('Modificación al calendario escolar')
) as item(nombre)
where not exists (
  select 1
  from public.motivos_sesion_extraordinaria existing
  where lower(btrim(existing.nombre)) = lower(btrim(item.nombre))
);

alter table public.actas
  add column if not exists motivo_extraordinaria_id uuid null references public.motivos_sesion_extraordinaria(id) on delete set null,
  add column if not exists motivo_extraordinaria text null;

update public.actas
set motivo_extraordinaria_id = null,
    motivo_extraordinaria = null
where tipo_sesion = 'Ordinaria';

alter table public.motivos_sesion_extraordinaria enable row level security;

grant select, insert on public.motivos_sesion_extraordinaria to authenticated;

drop policy if exists "Lectura motivos sesion extraordinaria" on public.motivos_sesion_extraordinaria;
create policy "Lectura motivos sesion extraordinaria"
on public.motivos_sesion_extraordinaria
for select
to authenticated
using (true);

drop policy if exists "Insercion motivos sesion extraordinaria" on public.motivos_sesion_extraordinaria;
create policy "Insercion motivos sesion extraordinaria"
on public.motivos_sesion_extraordinaria
for insert
to authenticated
with check (true);