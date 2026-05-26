alter table public.actas
  add column if not exists suspension_clases_detalle jsonb null;

update public.actas
set suspension_clases_detalle = null
where modo_registro <> 'ACTA_COMPLETA'
   or tipo_sesion <> 'Extraordinaria'
   or coalesce(motivo_extraordinaria, '') <> 'Suspensión de clases';