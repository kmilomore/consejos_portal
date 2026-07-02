-- 20260702_consejos_portal_event_log.sql
-- Tubería de eventos para /admin/auditoria/:
--   1. amplía el enum log_action con eventos de cuenta, evidencias, programación y export
--   2. crea la RPC segura log_portal_event() para registrar eventos desde el cliente
--      (el actor sale del JWT, no del payload: el cliente no puede suplantar usuario)
--   3. registra CREAR_CUENTA vía trigger sobre auth.users

-- 1) Nuevos valores del enum ------------------------------------------------

alter type public.log_action add value if not exists 'CREAR_CUENTA';
alter type public.log_action add value if not exists 'SUBIR_EVIDENCIA';
alter type public.log_action add value if not exists 'ELIMINAR_EVIDENCIA';
alter type public.log_action add value if not exists 'PROGRAMAR_SESION';
alter type public.log_action add value if not exists 'EDITAR_PROGRAMACION';
alter type public.log_action add value if not exists 'CANCELAR_PROGRAMACION';
alter type public.log_action add value if not exists 'EXPORTAR_ACTAS';

-- 2) RPC de registro de eventos ---------------------------------------------
-- security definer para que cualquier usuario autenticado pueda dejar bitácora
-- sin depender de current_user_rbd() (roles nuevos pueden tener rbd null o múltiple).
-- El nombre del actor se toma SIEMPRE del JWT.

create or replace function public.log_portal_event(
  p_accion text,
  p_rbd text default '',
  p_detalle text default '',
  p_vista_origen text default ''
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_accion public.log_action;
begin
  if auth.uid() is null then
    raise exception 'Solo usuarios autenticados pueden registrar eventos.';
  end if;

  v_email := coalesce(nullif(trim(auth.jwt() ->> 'email'), ''), 'usuario-sin-correo');

  -- LOGIN y acciones operativas permitidas desde cliente.
  -- CREAR_CUENTA queda reservado al trigger de auth.users.
  if p_accion not in (
    'LOGIN',
    'CREAR_ACTA', 'EDITAR_ACTA', 'ELIMINAR_ACTA',
    'SUBIR_EVIDENCIA', 'ELIMINAR_EVIDENCIA',
    'PROGRAMAR_SESION', 'EDITAR_PROGRAMACION', 'CANCELAR_PROGRAMACION',
    'EXPORTAR_ACTAS'
  ) then
    raise exception 'Acción de bitácora no permitida: %', p_accion;
  end if;

  v_accion := p_accion::public.log_action;

  -- Dedupe de LOGIN en servidor: si el mismo usuario ya registró un ingreso
  -- en los últimos 5 minutos, se ignora en silencio. Cubre el caso borde de
  -- localStorage borrado con sesión viva sin duplicar la bitácora.
  if v_accion = 'LOGIN'::public.log_action and exists (
    select 1
    from public.logs
    where usuario = v_email
      and accion = 'LOGIN'::public.log_action
      and created_at > now() - interval '5 minutes'
  ) then
    return;
  end if;

  insert into public.logs (usuario, rbd, accion, detalle, vista_origen)
  values (
    v_email,
    left(coalesce(p_rbd, ''), 20),
    v_accion,
    left(coalesce(p_detalle, ''), 500),
    left(coalesce(p_vista_origen, ''), 120)
  );
end;
$$;

revoke all on function public.log_portal_event(text, text, text, text) from public;
revoke all on function public.log_portal_event(text, text, text, text) from anon;
grant execute on function public.log_portal_event(text, text, text, text) to authenticated;

-- 3) Trigger de creación de cuentas ------------------------------------------
-- Nunca debe bloquear un signup: cualquier error queda silenciado.

create or replace function public.log_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.logs (usuario, rbd, accion, detalle, vista_origen)
  values (
    coalesce(nullif(trim(new.email), ''), 'usuario-sin-correo'),
    '',
    'CREAR_CUENTA'::public.log_action,
    'Cuenta creada en auth.users (proveedor: ' || coalesce(new.raw_app_meta_data ->> 'provider', 'desconocido') || ').',
    'auth'
  );
  return new;
exception
  when others then
    return new;
end;
$$;

drop trigger if exists trg_log_new_auth_user on auth.users;
create trigger trg_log_new_auth_user
after insert on auth.users
for each row execute function public.log_new_auth_user();
