-- Fix: restore usuarios_perfiles.rbd fallback in current_accessible_rbds().
--
-- Since migration 20260514, current_accessible_rbds() only reads from
-- usuario_establecimiento_roles. A director whose email has a normalization
-- difference between BASE DE DATOS ESCUELAS SLEP and the JWT (e.g., domain
-- alias, trailing space in the spreadsheet, encoding variant) ends up with no
-- row in usuario_establecimiento_roles. This causes:
--
--   current_accessible_rbds() → empty
--   has_school_scope_access(rbd) → false
--   establecimientos SELECT with RLS → 0 rows / error
--   client setAccessError() → portal shows error screen, no shell, no nav
--
-- The fix adds a third union leg that includes the director's own rbd from
-- usuarios_perfiles. The profile row is created by the trusted bootstrap
-- function, so the rbd value is authoritative. This leg does not apply to
-- global admins or collaborators (they have no rbd in their profile) and does
-- not change the behavior for directors who are already in
-- usuario_establecimiento_roles.

create or replace function public.current_accessible_rbds()
returns table (rbd text)
language sql
stable
security definer
set search_path = public
as $$
  -- Global admin or collaborator: full school list.
  select establecimientos.rbd
  from public.establecimientos
  where public.is_global_admin() or public.has_global_readonly_access()

  union

  -- Users with an explicit active role assigned to a school.
  select distinct roles.rbd
  from public.usuario_establecimiento_roles roles
  where roles.email_normalizado = public.normalize_portal_email(auth.jwt() ->> 'email')
    and roles.activo = true
    and roles.rbd is not null

  union

  -- Fallback: director's own school from their profile.
  -- Covers the case where the email stored in usuario_establecimiento_roles
  -- does not match the normalized JWT email (sync gap or format mismatch).
  select profile.rbd
  from public.usuarios_perfiles profile
  where profile.id = auth.uid()
    and profile.rbd is not null;
$$;
