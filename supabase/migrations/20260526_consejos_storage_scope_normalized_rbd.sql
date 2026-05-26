create or replace function public.has_school_scope_access_storage_key(target_storage_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    target_storage_key is not null
    and (
      public.is_global_admin()
      or exists (
        select 1
        from public.current_accessible_rbds() scoped
        where scoped.rbd = target_storage_key
           or replace(scoped.rbd, '/', '-') = target_storage_key
      )
    );
$$;

grant execute on function public.has_school_scope_access_storage_key(text) to authenticated;

drop policy if exists "Lectura evidencias por rbd" on storage.objects;
create policy "Lectura evidencias por rbd"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'evidencias_actas'
  and public.has_school_scope_access_storage_key(nullif(split_part(name, '/', 1), ''))
);

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