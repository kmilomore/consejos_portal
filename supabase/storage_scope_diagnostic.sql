-- Diagnostico manual para errores de upload en storage.objects:
-- `new row violates row-level security policy`
--
-- Uso:
-- 1. Reemplaza target_email y target_rbd en el CTE `params`.
-- 2. Ejecuta el script en Supabase SQL Editor.
-- 3. Revisa si el usuario tiene alcance real en `usuario_establecimiento_roles`
--    y si las politicas activas de `storage.objects` siguen alineadas con
--    `has_school_scope_access()`.

with params as (
  select
    lower(trim('REEMPLAZAR_CORREO@dominio.cl'))::text as target_email,
    'REEMPLAZAR_RBD'::text as target_rbd
)
select
  'bucket' as check_name,
  jsonb_build_object(
    'id', bucket.id,
    'public', bucket.public,
    'file_size_limit', bucket.file_size_limit,
    'allowed_mime_types', bucket.allowed_mime_types
  ) as details
from storage.buckets bucket
where bucket.id = 'evidencias_actas'

union all

select
  'usuario_establecimiento_roles' as check_name,
  coalesce(
    jsonb_agg(
      jsonb_build_object(
        'email_normalizado', roles.email_normalizado,
        'rbd', roles.rbd,
        'rol', roles.rol,
        'equipo', roles.equipo,
        'activo', roles.activo,
        'origen', roles.origen
      )
      order by roles.activo desc, roles.rbd nulls first, roles.rol, roles.equipo
    ),
    '[]'::jsonb
  ) as details
from params
left join public.usuario_establecimiento_roles roles
  on roles.email_normalizado = params.target_email

union all

select
  'usuarios_perfiles' as check_name,
  coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', profile.id,
        'correo_electronico', profile.correo_electronico,
        'rol', profile.rol,
        'rbd', profile.rbd,
        'comuna', profile.comuna,
        'nombre_director', profile.nombre_director
      )
      order by profile.updated_at desc nulls last
    ),
    '[]'::jsonb
  ) as details
from params
left join public.usuarios_perfiles profile
  on lower(trim(profile.correo_electronico)) = params.target_email

union all

select
  'establecimientos_accesos' as check_name,
  coalesce(
    jsonb_agg(
      jsonb_build_object(
        'scope_kind', accesos.scope_kind,
        'rbd', accesos.rbd,
        'comuna', accesos.comuna,
        'activo', accesos.activo,
        'descripcion', accesos.descripcion
      )
      order by accesos.activo desc, accesos.scope_kind, accesos.rbd nulls first, accesos.comuna nulls first
    ),
    '[]'::jsonb
  ) as details
from params
left join public.establecimientos_accesos accesos
  on public.normalize_portal_email(accesos.email_normalizado) = params.target_email

union all

select
  'target_rbd_in_roles' as check_name,
  jsonb_build_object(
    'target_rbd', params.target_rbd,
    'target_storage_key', replace(params.target_rbd, '/', '-'),
    'has_active_role_scope', exists (
      select 1
      from public.usuario_establecimiento_roles roles
      where roles.email_normalizado = params.target_email
        and roles.activo = true
        and roles.rbd = params.target_rbd
    ),
    'has_active_role_scope_via_storage_key', exists (
      select 1
      from public.usuario_establecimiento_roles roles
      where roles.email_normalizado = params.target_email
        and roles.activo = true
        and replace(roles.rbd, '/', '-') = replace(params.target_rbd, '/', '-')
    ),
    'has_active_establecimientos_accesos_scope', exists (
      select 1
      from public.establecimientos_accesos accesos
      where public.normalize_portal_email(accesos.email_normalizado) = params.target_email
        and accesos.activo = true
        and (
          accesos.scope_kind = 'GLOBAL'
          or (accesos.scope_kind = 'ESTABLECIMIENTO' and accesos.rbd = params.target_rbd)
          or (
            accesos.scope_kind = 'COMUNA'
            and exists (
              select 1
              from public.establecimientos est
              where est.rbd = params.target_rbd
                and est.comuna = accesos.comuna
            )
          )
        )
    )
  ) as details
from params

union all

select
  'storage_policies' as check_name,
  coalesce(
    jsonb_agg(
      jsonb_build_object(
        'policyname', policy.policyname,
        'cmd', policy.cmd,
        'roles', policy.roles,
        'qual', policy.qual,
        'with_check', policy.with_check
      )
      order by policy.policyname
    ),
    '[]'::jsonb
  ) as details
from pg_policies policy
where policy.schemaname = 'storage'
  and policy.tablename = 'objects'
  and policy.policyname in (
    'Lectura evidencias por rbd',
    'Carga evidencias por rbd',
    'Actualizacion evidencias por rbd',
    'Borrado evidencias por rbd'
  );