alter table public.actas
  add column if not exists modo_registro text not null default 'ACTA_COMPLETA',
  add column if not exists observacion_documental text not null default '';

alter table public.actas
  drop constraint if exists actas_modo_registro_check;

alter table public.actas
  add constraint actas_modo_registro_check
  check (modo_registro in ('ACTA_COMPLETA', 'REGISTRO_DOCUMENTAL'));

alter table public.actas
  drop constraint if exists actas_registro_documental_doc_check;

alter table public.actas
  add constraint actas_registro_documental_doc_check
  check (
    modo_registro <> 'REGISTRO_DOCUMENTAL'
    or nullif(btrim(coalesce(link_acta, '')), '') is not null
  );

alter table public.actas
  alter column hora_inicio drop not null,
  alter column hora_termino drop not null;