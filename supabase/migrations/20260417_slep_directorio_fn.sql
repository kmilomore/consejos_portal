-- Exposes the full BASE DE DATOS ESCUELAS SLEP table in a clean, typed form
-- for the admin dashboard. SECURITY DEFINER avoids RLS recursion on the raw table.

create or replace function public.get_slep_directorio()
returns table (
  rbd                   text,
  nombre_establecimiento text,
  comuna                text,
  rural_urbano          text,
  tipo                  text,
  director              text,
  representante_consejo text,
  correo_representante  text,
  asesor_uatp           text,
  correo_asesor         text,
  correo_electronico    text,
  latitud               text,
  longitud              text
)
language sql
security definer
stable
set search_path = public
as $$
  select
    nullif(trim(base."RBD"), '')                        as rbd,
    nullif(trim(base."NOMBRE ESTABLECIMIENTO"), '')     as nombre_establecimiento,
    nullif(trim(base."COMUNA"), '')                     as comuna,
    nullif(trim(base."RURAL/URBANO"), '')               as rural_urbano,
    nullif(trim(base."TIPO"), '')                       as tipo,
    nullif(trim(base."DIRECTOR/A"), '')                 as director,
    nullif(trim(base."REPRESENTANTE CONSEJO ESCOLAR"), '') as representante_consejo,
    nullif(trim(base."CORREO REPRESENTANTE"), '')       as correo_representante,
    nullif(trim(base."ASESOR UATP"), '')                as asesor_uatp,
    nullif(trim(base."CORREO ASESOR"), '')              as correo_asesor,
    nullif(trim(base."CORREO ELECTRÓNICO"), '')         as correo_electronico,
    nullif(trim(base."LATITUD"), '')                    as latitud,
    nullif(trim(base."LONGITUD"), '')                   as longitud
  from public."BASE DE DATOS ESCUELAS SLEP" as base
  order by base."COMUNA" nulls last, base."NOMBRE ESTABLECIMIENTO" nulls last;
$$;

-- Only authenticated users (anon cannot call it)
revoke execute on function public.get_slep_directorio() from anon;
grant execute on function public.get_slep_directorio() to authenticated;
