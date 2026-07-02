-- Aplicada en produccion el 2026-07-02 via Management API (auditoria en vivo).
--
-- Cierra dos brechas creadas fuera de las migraciones de Consejos (proyecto
-- Supabase compartido con portal-participacion) y limpia una fila invalida:
--
-- 1. `actas` tenia una politica SELECT para `anon` con USING (true)
--    ("anon_select_directorio", patron de portal-participacion): las 125 actas
--    eran legibles sin sesion con la anon key. Se elimina. La lectura queda
--    solo para sesiones autenticadas: "actas_select_portal_authenticated"
--    (authenticated, USING true — decision explicita 2026-07-02: lectura amplia
--    para usuarios institucionales con sesion confirmada) + "Leer actas por rbd"
--    (alcance por RBD). La escritura sigue gateada por has_school_write_access().
--
-- 2. `"BASE DE DATOS ESCUELAS SLEP"` tenia UPDATE e INSERT abiertos a cualquier
--    autenticado (USING/WITH CHECK true). Como la lista blanca de Consejos se
--    re-sincroniza desde esa planilla en cada bootstrap, cualquier usuario de
--    cualquiera de los dos portales podia alterar accesos de directores en
--    silencio. Se restringe a los editores legitimos: los roles
--    admin/coordinador/fi/be de `auth_users_roles` (el mismo gate que
--    DirectorioPage.tsx de portal-participacion aplica solo en cliente) mas el
--    admin global de Consejos. Las politicas SELECT de la planilla no se tocan.
--
-- 3. Se desactiva la fila ADMIN con typo de dominio sembrada por la migracion
--    20260514 ('camilo.serra@slepcolchagua.c', sin la 'l' final): nunca paso el
--    gate de dominio y solo era ruido en la lista blanca.

-- FIX 1: eliminar lectura anonima de actas
drop policy if exists "anon_select_directorio" on public.actas;

-- FIX 2: cerrar escritura abierta de la planilla maestra
create or replace function public.is_base_escuelas_editor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_global_admin()
    or exists (
      select 1
      from public.auth_users_roles r
      where lower(r.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
        and r.activo = true
        and r.rol in ('admin', 'coordinador', 'fi', 'be')
    );
$$;

grant execute on function public.is_base_escuelas_editor() to authenticated;

drop policy if exists "base_escuelas_update_authenticated" on public."BASE DE DATOS ESCUELAS SLEP";
create policy "base_escuelas_update_authenticated"
on public."BASE DE DATOS ESCUELAS SLEP"
for update
to authenticated
using (public.is_base_escuelas_editor())
with check (public.is_base_escuelas_editor());

drop policy if exists "Enable insert for authenticated users only" on public."BASE DE DATOS ESCUELAS SLEP";
drop policy if exists "base_escuelas_insert_editores" on public."BASE DE DATOS ESCUELAS SLEP";
create policy "base_escuelas_insert_editores"
on public."BASE DE DATOS ESCUELAS SLEP"
for insert
to authenticated
with check (public.is_base_escuelas_editor());

-- FIX 3 (limpieza): desactivar fila admin con typo de dominio
update public.usuario_establecimiento_roles
set activo = false
where correo_electronico = 'camilo.serra@slepcolchagua.c';
