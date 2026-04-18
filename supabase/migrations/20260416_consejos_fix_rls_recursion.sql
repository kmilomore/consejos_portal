-- Fix recursión infinita: is_admin() consultaba usuarios_perfiles,
-- que tiene una política RLS que llama a is_admin() → stack overflow.
-- SECURITY DEFINER hace que la función ejecute sin RLS, cortando el ciclo.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.usuarios_perfiles profile
    where profile.id = auth.uid()
      and profile.rol = 'ADMIN'
  );
$$;

-- Igual para current_user_rbd por la misma razón
create or replace function public.current_user_rbd()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select profile.rbd
  from public.usuarios_perfiles profile
  where profile.id = auth.uid();
$$;
