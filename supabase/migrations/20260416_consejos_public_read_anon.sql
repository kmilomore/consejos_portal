drop policy if exists "Lectura publica establecimientos" on public.establecimientos;
create policy "Lectura publica establecimientos"
on public.establecimientos
for select
to anon
using (true);

drop policy if exists "Lectura publica programacion" on public.programacion;
create policy "Lectura publica programacion"
on public.programacion
for select
to anon
using (true);

drop policy if exists "Lectura publica actas" on public.actas;
create policy "Lectura publica actas"
on public.actas
for select
to anon
using (true);

drop policy if exists "Lectura publica invitados actas" on public.actas_invitados;
create policy "Lectura publica invitados actas"
on public.actas_invitados
for select
to anon
using (true);