-- La migracion 20260608 introdujo has_school_write_access_storage_key para los
-- policies de escritura (INSERT/UPDATE/DELETE) de evidencias_actas. Esta funcion
-- agregaba is_portal_allowed_email() y una query directa sobre
-- usuario_establecimiento_roles que, en el contexto del servicio de storage de
-- Supabase, falla con "new row violates row-level security policy" incluso para
-- usuarios con rol REPRESENTANTE activo y email valido.
--
-- has_school_scope_access_storage_key (20260526_consejos_storage_scope_normalized_rbd)
-- ya maneja RBDs con "/" mediante replace(scoped.rbd, '/', '-') = target_storage_key
-- y funcionaba correctamente para todos los roles antes de 20260608.
--
-- Se revierten los tres policies de escritura a has_school_scope_access_storage_key.

drop policy if exists "Carga evidencias por rbd" on storage.objects;
create policy "Carga evidencias por rbd"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'evidencias_actas'
  and public.has_school_scope_access_storage_key(nullif(split_part(name, '/', 1), ''))
);

drop policy if exists "Actualizacion evidencias por rbd" on storage.objects;
create policy "Actualizacion evidencias por rbd"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'evidencias_actas'
  and public.has_school_scope_access_storage_key(nullif(split_part(name, '/', 1), ''))
)
with check (
  bucket_id = 'evidencias_actas'
  and public.has_school_scope_access_storage_key(nullif(split_part(name, '/', 1), ''))
);

drop policy if exists "Borrado evidencias por rbd" on storage.objects;
create policy "Borrado evidencias por rbd"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'evidencias_actas'
  and public.has_school_scope_access_storage_key(nullif(split_part(name, '/', 1), ''))
);
