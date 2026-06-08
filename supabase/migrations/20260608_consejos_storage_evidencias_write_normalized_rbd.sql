-- buildActaDocumentPath() (lib/supabase/queries.ts) escribe el primer segmento del
-- storage key como rbd.replace(/\//g, "-"), pero has_school_write_access() compara
-- roles.rbd = target_rbd de forma literal. Para escuelas cuyo RBD contiene "/"
-- (anexos), el segmento del storage key llega con "-" y la comparacion exacta
-- nunca calza, por lo que el insert/update/delete sobre evidencias_actas
-- termina rechazado con "new row violates row-level security policy".
--
-- Se agrega una variante de chequeo de escritura que normaliza el rbd igual que
-- has_school_scope_access_storage_key() (lectura), y se reasignan las policies
-- de carga/actualizacion/borrado de evidencias_actas para usarla.

create or replace function public.has_school_write_access_storage_key(target_storage_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    target_storage_key is not null
    and public.is_portal_allowed_email()
    and (
      public.is_global_admin()
      or exists (
        select 1
        from public.usuario_establecimiento_roles roles
        where roles.email_normalizado = public.normalize_portal_email(auth.jwt() ->> 'email')
          and roles.activo = true
          and roles.rol in ('DIRECTOR', 'REPRESENTANTE')
          and (
            roles.rbd = target_storage_key
            or replace(roles.rbd, '/', '-') = target_storage_key
          )
      )
    );
$$;

grant execute on function public.has_school_write_access_storage_key(text) to authenticated;

drop policy if exists "Carga evidencias por rbd" on storage.objects;
create policy "Carga evidencias por rbd"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'evidencias_actas'
  and public.has_school_write_access_storage_key(nullif(split_part(name, '/', 1), ''))
);

drop policy if exists "Actualizacion evidencias por rbd" on storage.objects;
create policy "Actualizacion evidencias por rbd"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'evidencias_actas'
  and public.has_school_write_access_storage_key(nullif(split_part(name, '/', 1), ''))
)
with check (
  bucket_id = 'evidencias_actas'
  and public.has_school_write_access_storage_key(nullif(split_part(name, '/', 1), ''))
);

drop policy if exists "Borrado evidencias por rbd" on storage.objects;
create policy "Borrado evidencias por rbd"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'evidencias_actas'
  and public.has_school_write_access_storage_key(nullif(split_part(name, '/', 1), ''))
);
