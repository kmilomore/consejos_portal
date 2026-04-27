insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'evidencias_actas',
  'evidencias_actas',
  true,
  10485760,
  null
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- evidencias_actas queda publico para compatibilizar link_acta con getPublicUrl().
-- Las escrituras siguen restringidas por las politicas RLS existentes sobre storage.objects.