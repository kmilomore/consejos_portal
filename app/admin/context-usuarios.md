# Contexto Operativo: Gestion de usuarios

> Ultima actualizacion: 2026-05-26  
> Objetivo: este documento formaliza la pantalla `/admin/usuarios/` como modulo operativo del portal y deja su flujo completo listo para iterar con IA sin redescubrir permisos, datos ni restricciones.  
> Contexto general del portal: ver `../../context.md` para arquitectura global, decisiones transversales y contrato de acceso.

---

## 1. Proposito del modulo

La pantalla `/admin/usuarios/` permite gestionar accesos manuales del portal sobre la tabla `usuario_establecimiento_roles`.

El modulo cubre estos casos reales:

- crear accesos manuales nuevos para correos ya existentes en Supabase Auth
- asignar un rol global o un rol asociado a escuela
- editar una asignacion manual existente
- desactivar accesos manuales previos
- revisar accesos sincronizados desde la base maestra sin modificarlos localmente
- filtrar, buscar y paginar la tabla de accesos registrados

La pantalla no crea usuarios de Auth ni reemplaza la base maestra. Formaliza accesos del portal sobre identidades ya existentes.

---

## 2. Contrato de acceso

### Quien puede entrar

Solo un `ADMIN` global puede usar esta pantalla.

Guardias vigentes:

- cliente: `app/admin/usuarios/page.tsx` redirige a `/admin/` si `isGlobalAdmin === false`
- servidor de datos: la RPC `upsert_usuario_establecimiento_rol(...)` rechaza cualquier usuario que no cumpla `public.is_global_admin()`
- RLS: la migracion `20260526_consejos_admin_user_management_rls.sql` deja la gestion de `usuario_establecimiento_roles` solo para admin global

### Roles que se pueden asignar

- `ADMIN`: acceso global con escritura total y permiso para gestionar usuarios
- `COLABORADOR`: acceso global de solo lectura
- `DIRECTOR`: acceso de establecimiento, aterriza en `/resumen/`
- `REPRESENTANTE`: navegacion tipo admin con alcance parcial al `RBD` asociado

### Regla clave de alcance

- `ADMIN` y `COLABORADOR` son roles globales: deben persistirse con `rbd = null`
- `DIRECTOR` y `REPRESENTANTE` requieren `rbd`
- la lectura del portal usa `has_school_scope_access(...)`
- la escritura del portal usa `has_school_write_access(...)`
- `canSelectSchool` no equivale a permiso de escritura

---

## 3. Archivos fuente de verdad

### UI principal

- `app/admin/usuarios/page.tsx`  
  Pantalla completa de gestion de usuarios: KPIs, formulario, filtros, tabla, paginacion y desactivacion.

### Capa de datos

- `lib/supabase/queries.ts`  
  Expone las tres operaciones del modulo:
  - `listPortalUserAccess()`
  - `upsertPortalUserAccess(...)`
  - `deactivatePortalUserAccess(...)`

### Contexto y directorio

- `lib/auth/context.tsx`  
  Expone `isGlobalAdmin`, estado de sesion y correo autenticado.

- `lib/hooks/use-slep-directorio.ts`  
  Entrega el catalogo visible de escuelas para resolver selector, nombre de establecimiento y comuna por `RBD`.

### Tipos de dominio

- `types/domain.ts`  
  Contrato de `PortalManagedAccessRole` y `PortalUserAccess`.

### Contrato SQL y seguridad

- `supabase/migrations/20260514_consejos_usuario_establecimiento_roles.sql`
- `supabase/migrations/20260526_consejos_admin_user_management_rls.sql`
- `supabase/migrations/20260526_consejos_colaborador_readonly.sql`

---

## 4. Modelo mental del modulo

Hay que pensar esta pantalla como un panel de asignaciones de acceso, no como un CRUD de personas.

La entidad operativa real es una fila de `usuario_establecimiento_roles`.

Cada fila combina:

- correo
- rol
- `RBD` o alcance global
- equipo
- origen
- metadata libre
- estado activo/inactivo

### Dos clases de filas

#### 4.1 Filas manuales

Son creadas desde esta pantalla con `origen = 'manual'`.

Se pueden:

- crear
- editar
- desactivar

#### 4.2 Filas sincronizadas

Provienen de la base maestra o de procesos de sincronizacion.

Se muestran como referencia, pero no deben editarse ni desactivarse desde esta pantalla. Si requieren correccion, se corrige la fuente de origen.

---

## 5. Flujo de datos real

### 5.1 Carga inicial

Cuando `isGlobalAdmin === true`, la pagina ejecuta `loadRows()`.

`loadRows()`:

1. pone `isLoadingRows = true`
2. llama `listPortalUserAccess()`
3. si falla, muestra `toast(error, "error")`
4. actualiza `rows`
5. termina con `isLoadingRows = false`

La consulta actual lee directamente:

- tabla `usuario_establecimiento_roles`
- columnas `id, correo_electronico, email_normalizado, rbd, rol, equipo, origen, metadata, activo, created_at, updated_at`
- orden `updated_at desc`

### 5.2 Datos derivados en cliente

La pagina deriva:

- `schoolMap`: `Map<RBD, escuela>` desde `useSlepDirectorio()`
- `filteredRows`: aplica busqueda, filtro por rol y filtro por estado
- `paginatedRows`: subset visible por pagina con `PAGE_SIZE = 10`
- `stats`: usuarios activos, asignaciones activas, admins globales y escuelas cubiertas

### 5.3 Busqueda y filtros

La busqueda textual revisa:

- `correo_electronico`
- `email_normalizado`
- `rol`
- `equipo`
- `rbd`
- nombre de establecimiento
- comuna
- nombre de referencia resuelto desde metadata

Filtros vigentes:

- por rol
- por estado (`active`, `inactive`, `all`)

La pagina reinicia a `page = 1` cada vez que cambian filtros, busqueda o dataset.

---

## 6. Formulario y reglas de ingreso

### Campos del formulario

- `correo`
- `rol`
- `rbd` cuando el rol lo exige
- `nombreReferencia`

### Configuracion por rol

La constante `ROLE_OPTIONS` define para cada rol:

- etiqueta visible
- `team`
- `requiresRbd`

Configuracion vigente:

- `ADMIN` → `team = ""`, `requiresRbd = false`
- `COLABORADOR` → `team = ""`, `requiresRbd = false`
- `DIRECTOR` → `team = "DIRECCION"`, `requiresRbd = true`
- `REPRESENTANTE` → `team = "CONSEJO_ESCOLAR"`, `requiresRbd = true`

### Metadata construida

`buildMetadata()` arma metadata operativa para la fila:

- `display_name`
- `comuna` cuando existe escuela
- `director` para rol `DIRECTOR`
- `representante` para rol `REPRESENTANTE`
- `establecimiento` cuando existe escuela

### Validaciones vigentes

- el correo debe existir y contener `@`
- si el rol requiere escuela, `rbd` es obligatorio
- para roles globales, `rbd` se limpia en cliente y se fuerza a `null` en SQL

---

## 7. Flujos funcionales completos

### 7.1 Crear acceso manual

Ruta actual:

1. el admin completa correo, rol y opcionalmente nombre de referencia
2. si el rol requiere escuela, selecciona `RBD`
3. el formulario llama `upsertPortalUserAccess(...)`
4. la capa de datos ejecuta la RPC `upsert_usuario_establecimiento_rol(...)`
5. si todo sale bien, la pagina recarga filas, resetea formulario y muestra `toast("Acceso agregado.", "success")`

Persistencia real:

- correo se normaliza en SQL
- `ADMIN` y `COLABORADOR` terminan siempre con alcance global
- `origen` se persiste como `manual`

### 7.2 Editar acceso manual

Ruta actual:

1. el usuario pulsa `Editar` sobre una fila manual
2. `handleEdit(row)` hidrata el formulario desde la fila seleccionada
3. si cambia el identificador logico de la asignacion, la pagina trata la edicion como reemplazo

Identificador logico usado por cliente:

`email_normalizado + rol + rbd|__GLOBAL__ + equipo`

Comportamiento actual:

- primero se guarda la nueva asignacion con `upsertPortalUserAccess(...)`
- si el identificador previo cambia, luego se desactiva la fila anterior con `deactivatePortalUserAccess(id)`

Esto evita perder acceso si el alta nueva falla a mitad del cambio.

### 7.3 Desactivar acceso manual

Ruta actual:

1. el usuario pulsa `Eliminar` en una fila manual activa
2. se abre `ConfirmDialog`
3. `handleDeactivate()` ejecuta `deactivatePortalUserAccess(accessId)`
4. la query hace `update { activo: false }` sobre `usuario_establecimiento_roles`
5. la pagina recarga filas y muestra `toast("Acceso desactivado.", "success")`

Importante:

- no se hace hard delete
- el historico sigue existiendo como fila inactiva

### 7.4 Recargar tabla

El boton `Recargar` vuelve a ejecutar `loadRows()` y no altera filtros ni pagina, salvo que el dataset resultante los invalide.

---

## 8. Restricciones y protecciones operativas

### Protecciones de UI vigentes

- filas no manuales no se pueden editar ni desactivar
- un admin global no puede editar ni desactivar su propio acceso global desde esta vista
- una fila inactiva no muestra desactivacion disponible

### Protecciones reales que no dependen de la UI

- la RPC `upsert_usuario_establecimiento_rol(...)` exige `public.is_global_admin()`
- la tabla `usuario_establecimiento_roles` queda protegida por RLS admin-only
- la migracion read-only impide que `COLABORADOR` gane permisos de escritura en otros modulos aunque exista visualmente en la tabla

### Regla importante

El panel protege bastante desde cliente, pero la seguridad real vive en SQL y RLS. No confiar solo en los botones deshabilitados.

---

## 9. Invariantes de no-regresion

1. `/admin/usuarios/` sigue siendo una pantalla exclusiva de admin global.
2. `ROLE_OPTIONS` sigue siendo la fuente de verdad del formulario para roles, equipo y requerimiento de `RBD`.
3. `ADMIN` y `COLABORADOR` deben quedar globales, nunca con `rbd`.
4. `DIRECTOR` y `REPRESENTANTE` deben quedar asociados a escuela.
5. las filas sincronizadas no se editan desde esta pantalla.
6. desactivar acceso significa `activo = false`, no borrar la fila.
7. editar una asignacion que cambie su clave logica debe seguir el orden: crear/actualizar nuevo acceso primero, desactivar el anterior despues.
8. el panel no crea usuarios de Supabase Auth; solo gestiona accesos del portal.
9. `canManageUsers` debe seguir siendo exclusivo de admin global.
10. `COLABORADOR` puede aparecer en la tabla y en el formulario, pero no debe recibir permisos de escritura en el resto del portal.

---

## 10. Riesgos y fragilidades actuales

- si las migraciones `20260526_consejos_admin_user_management_rls.sql` o `20260526_consejos_colaborador_readonly.sql` no estan aplicadas, el comportamiento del panel puede quedar incoherente con la seguridad real
- si la base maestra vuelve a sincronizar una fila manualmente corregida desde otro origen, puede reaparecer una asignacion paralela con distinto `origen`
- la pagina asume que el correo ya existe en Auth; si no existe, la asignacion se puede guardar igual pero ese usuario no podra iniciar sesion utilmente hasta ser creado en Auth
- la estadistica `Admins globales` hoy cuenta solo filas activas con `rol = 'ADMIN'` y `rbd = null`; no cuenta colaboradores globales
- la pagina no expone auditoria detallada de quien hizo cada cambio; solo muestra `updated_at`

---

## 11. Checklist para tocar este modulo

Antes de editar:

1. revisar `../../context.md` y este archivo
2. revisar `app/admin/usuarios/page.tsx`
3. revisar `lib/supabase/queries.ts` para las tres operaciones del modulo
4. confirmar que siguen aplicadas las migraciones de acceso y read-only

Si tocas formulario:

1. validar `ROLE_OPTIONS`
2. validar `buildMetadata()`
3. validar regla `requiresRbd`

Si tocas persistencia:

1. revisar `upsertPortalUserAccess(...)`
2. revisar `deactivatePortalUserAccess(...)`
3. revisar la RPC `upsert_usuario_establecimiento_rol(...)`

Validacion minima esperada:

1. `npm run build`
2. prueba manual de alta `ADMIN`
3. prueba manual de alta `COLABORADOR`
4. prueba manual de alta `DIRECTOR` o `REPRESENTANTE` con escuela
5. prueba manual de desactivacion de una fila manual

---

## 12. Resumen del flujo

```text
AdminUsuariosPage monta
  -> usePortalAuth() confirma isGlobalAdmin
  -> si no es global admin: redirect a /admin/
  -> loadRows()
    -> listPortalUserAccess()
    -> SELECT usuario_establecimiento_roles ORDER BY updated_at desc

Usuario crea acceso
  -> completa correo + rol + RBD si aplica + nombreReferencia
  -> buildMetadata()
  -> upsertPortalUserAccess(...)
    -> RPC upsert_usuario_establecimiento_rol(...)
  -> loadRows()
  -> resetForm()
  -> toast success

Usuario edita acceso manual
  -> handleEdit(row)
  -> formulario se hidrata
  -> submit
  -> guarda nueva asignacion
  -> si cambio la clave logica: deactivatePortalUserAccess(oldId)
  -> loadRows()

Usuario desactiva acceso manual
  -> ConfirmDialog
  -> deactivatePortalUserAccess(id)
  -> UPDATE activo = false
  -> loadRows()

Tabla visible
  -> filteredRows por query + rol + estado
  -> paginatedRows con PAGE_SIZE = 10
  -> acciones deshabilitadas para sincronizados y auto-admin global
```