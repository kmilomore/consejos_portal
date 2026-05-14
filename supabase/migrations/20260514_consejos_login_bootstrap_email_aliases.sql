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
      src.payload ->> 'DIRECTOR/A',
      src.payload ->> 'director',
      src.payload ->> 'director/a',
      src.payload ->> 'NOMBRE DIRECTOR',
      src.payload ->> 'NOMBRE DIRECTOR/A',
      src.payload ->> 'nombre_director'
    )), '') as director,
    public.normalize_portal_email(coalesce(
      src.payload ->> 'CORREO ELECTRONICO',
      src.payload ->> 'CORREO ELECTRÓNICO',
      src.payload ->> 'CORREO DIRECTOR',
      src.payload ->> 'CORREO DIRECTOR/A',
      src.payload ->> 'CORREO INSTITUCIONAL',
      src.payload ->> 'correo_electronico',
      src.payload ->> 'correo electrónico',
      src.payload ->> 'correo director',
      src.payload ->> 'correo director/a',
      src.payload ->> 'correo institucional',
      src.payload ->> 'CORREO',
      src.payload ->> 'correo',
      src.payload ->> 'EMAIL',
      src.payload ->> 'E-MAIL',
      src.payload ->> 'email',
      src.payload ->> 'mail'
    )) as correo_electronico
  from (
    select to_jsonb(base) as payload
    from public."BASE DE DATOS ESCUELAS SLEP" as base
  ) as src;
$$;