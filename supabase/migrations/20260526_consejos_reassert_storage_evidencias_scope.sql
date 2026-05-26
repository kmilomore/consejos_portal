drop policy if exists "Lectura evidencias por rbd" on storage.objects;
create policy "Lectura evidencias por rbd"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'evidencias_actas'
  and public.has_school_scope_access(nullif(split_part(name, '/', 1), ''))
);

drop policy if exists "Carga evidencias por rbd" on storage.objects;
create policy "Carga evidencias por rbd"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'evidencias_actas'
  and public.has_school_scope_access(nullif(split_part(name, '/', 1), ''))
);

drop policy if exists "Actualizacion evidencias por rbd" on storage.objects;
create policy "Actualizacion evidencias por rbd"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'evidencias_actas'
  and public.has_school_scope_access(nullif(split_part(name, '/', 1), ''))
)
with check (
  bucket_id = 'evidencias_actas'
  and public.has_school_scope_access(nullif(split_part(name, '/', 1), ''))
);

drop policy if exists "Borrado evidencias por rbd" on storage.objects;
create policy "Borrado evidencias por rbd"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'evidencias_actas'
  and public.has_school_scope_access(nullif(split_part(name, '/', 1), ''))
);