# Contexto del Proyecto: Consejos

> **Última actualización:** 2026-07-02  
> **Fuente de verdad:** este archivo. El README.md está desactualizado.
> **Centro de documentación:** ver `docs/README.md` para navegar toda la documentación desde un solo lugar.
> **Contexto general unificado:** ver `docs/contexto-general.md` para una vista consolidada del sistema.
> **Seguridad:** ver `docs/seguridad.md` para autenticación, autorización, RLS y endurecimientos recientes.
> **Contexto específico de programación:** ver `context_programacion.md` para el detalle operativo completo del módulo `programacion/`, sus invariantes, flujos y criterios para iterar con IA.
> **Contexto de la landing pública:** ver `components/landing/context-landing.md` para la landing en `/`, las páginas legales y sus invariantes.

---

## 1. Resumen Ejecutivo

`Consejos/` es un portal de Consejos Escolares construido con Next.js 15, React 19, TypeScript y Tailwind CSS, desplegado como **export estático** sin servidor Node en producción.

El portal opera como aplicación autenticada por correo institucional usando Supabase Auth, con segmentación por establecimiento escolar y resolución automática de perfil desde la base maestra `BASE DE DATOS ESCUELAS SLEP`.

Desde 2026-07-02 el sitio tiene dos superficies:

1. **Sitio público** en `/`: landing informativa sobre los Consejos Escolares (qué son, integrantes, funciones, normativa, recursos, videos) más páginas legales (`/terminos/`, `/privacidad/`, `/cookies/`). Sin sesión, sin datos de Supabase. Ver `components/landing/context-landing.md`.
2. **Portal autenticado**: la experiencia de gestión existente.

Experiencia principal del portal:
1. Acceso en `/auth/login/` (Google OAuth con correo institucional vía Supabase), enlazado desde la landing con el botón "Acceder al Portal"
2. Vínculo automático del usuario con su escuela
3. Acceso a módulos de resumen, programación, actas y métricas según perfil y RBD

---

## 2. Estado Actual del Producto (2026-07-02)

### Ya implementado y funcional

- Tubería de eventos de auditoría completa (2026-07-02): RPC `log_portal_event()`, trigger `CREAR_CUENTA` sobre `auth.users`, e instrumentación de LOGIN, actas, evidencias, programación y export alimentando `/admin/auditoria/` — ver §9.z y `app/admin/context-auditoria.md`
- Landing pública en `/` sobre Consejos Escolares con acceso al portal en el menú (2026-07-02)
- Páginas legales públicas `/terminos/`, `/privacidad/` y `/cookies/` según normativa chilena (Leyes 19.628, 21.719, 21.663, 21.459)
- Rutas públicas declaradas en `AppFrame` (`isPublicRoute`); rutas protegidas sin sesión redirigen a `/auth/login/`
- Export estático con Next.js App Router (`output: "export"`)
- Autenticación con Google OAuth vía Supabase Auth para cuentas institucionales
- Callback OAuth explícito en `/auth/login/` con intercambio PKCE por `exchangeCodeForSession(code)`
- Bootstrap de perfil desde la base maestra de escuelas
- Shell autenticado por establecimiento con navegación lateral
- Selector de escuela para ADMIN (`SchoolSelector`)
- Selector de escuela con búsqueda tipeable en la navegación lateral
- Acceso resuelto desde una tabla única `usuario_establecimiento_roles` por `email_normalizado + rbd + rol`
- Perfil de director derivado desde `DIRECTOR/A` + `CORREO ELECTRÓNICO` de `BASE DE DATOS ESCUELAS SLEP`
- Cobertura de representantes derivada desde `CORREO REPRESENTANTE` por RBD en la misma base maestra
- Admin global resuelto también desde `usuario_establecimiento_roles` con `rol = 'ADMIN'` y `rbd = null`
- Colaborador global resuelto también desde `usuario_establecimiento_roles` con `rol = 'COLABORADOR'` y `rbd = null`
- Shell principal adaptado a ancho completo de pantalla y navegación con logo institucional `SLEPCOLCHAGUA.webp`
- Rediseño parcial del shell y módulos compartidos para mejorar jerarquía, tablas, botones, carga y lectura operativa
- Persistencia de escuela seleccionada en navegación admin mediante `localStorage`
- Corrección de persistencia de `selectedRbd` para evitar que la escuela activa se limpie durante la carga inicial del perfil `ADMIN`
- Corrección de hidratación en auth para restaurar caché y `selectedRbd` solo después del montaje cliente, evitando React error `418` al entrar con escuela activa persistida
- Corrección de rehidratación auth para validar el cache persistido contra el `user.id` confirmado por Supabase y evitar loops de retorno al login por estado stale de otro usuario en la misma pestaña
- Dropdown de escuelas diferenciado entre admin global y representante con alcance acotado por correo autenticado
- Panel admin agregado también acotado por escuelas y territorios del representante cuando no es admin global
- Sidebar con indicador explícito del tipo de acceso: `Admin global`, `Colaborador global` o `Cobertura asignada`
- Ruta `/admin/usuarios/` para gestionar accesos, roles, RBD y metadatos desde el portal
- Gestión de usuarios protegida por RLS y disponible solo para admin global
- Contrato de permisos separado entre lectura y escritura con `has_school_scope_access()` y `has_school_write_access()`
- Flags de alcance en cliente vía `get_current_portal_scope()`: `is_read_only` y `can_manage_users`
- UI read-only aplicada a colaborador en actas y programación, incluyendo bloqueo de drag-and-drop y acciones de mutación
- `PortalSnapshotProvider` — contexto de datos compartido, cero re-fetch al navegar, nunca se desmonta mientras exista sesión
- Navegación entre secciones sin flash visual ni pérdida de contenido (`app/loading.tsx` eliminado, `AppFrame` reestructurado)
- Cliente Supabase browser compartido como singleton para no re-crear sesión ni listeners en cada remount
- Caché de auth, snapshot y directorio reforzado con `sessionStorage` + deduplicación de requests en vuelo
- Snapshot portal versionado para invalidar caché stale después de mutaciones de actas/programación
- Directorio SLEP visible reforzado con fallback desde `establecimientos` cuando la RPC `get_slep_directorio()` omite escuelas válidas
- Rutas internas normalizadas con `trailingSlash: true` para evitar transiciones inconsistentes en export estático
- Módulo de programación operativo:
  - calendario mensual por establecimiento activo
  - creación real de sesiones ordinarias y extraordinarias
  - edición de programaciones existentes
  - cancelación lógica de sesiones (`estado = CANCELADA`)
  - creación de acta desde la misma pantalla de programación
  - vínculo persistente entre `programacion` y `actas`
- Módulo de actas completo:
  - Crear, editar, ver (solo lectura) y eliminar actas
  - Soporte fase 1 para `Registro documental` con PDF obligatorio y metadatos mínimos de sesión
  - Búsqueda y filtros en el listado
  - Filtro por `modo_registro` y badge visual para distinguir `Acta completa` vs `Registro documental`
  - Asistencia estamental con validación de RUT (módulo-11 chileno)
  - Persistencia de `rut` por asistente en formulario, snapshot y vista detalle
  - Nombre, RUT válido, correo y modalidad obligatorios para asistentes marcados como presentes
  - Quórum en tiempo real (4/6 mínimo)
  - Grilla dinámica de invitados
  - Upload de PDF con drag & drop
  - Borrador persistido en `localStorage` para creación y edición, con clave por acta
  - Precarga automática del establecimiento activo al abrir `Nueva acta`
  - Guardia de cambios sin guardar (dirty guard)
  - Advertencia `beforeunload` si hay cambios sin guardar
  - Toast de confirmación post-guardado
  - Vista de solo lectura con impresión A4
  - Vista detalle adaptada para `Registro documental` y horario nullable
  - Eliminación con confirmación
  - Rate limit cliente-side (cooldown 3 s)
  - Validación de RBD en submit por alcance real (`isGlobalAdmin + accessibleRbds`)
  - Sanitización de texto antes de persistir
- Métricas separadas entre `actas completas` y `registros documentales`
- `lib/supabase/queries.ts` restaurado como loader canónico del portal, con soporte para `modo_registro`, `observacion_documental`, `rut` en asistentes y `actasByMode`
- Sistema de toasts global (`toast()` + `<Toaster>`)
- `ConfirmDialog` reutilizable
- Branding institucional: Museo Sans local, paleta azul/blanco/rojo
- `@media print` para impresión de actas
- RPC `save_acta_complete` (migración creada, pendiente activar en cliente)

### Pendiente o parcial

- Eliminar PDF en storage al borrar acta (el DELETE en BD sí funciona)
- Eliminación dura de programaciones (hoy existe edición + cancelación lógica, no delete físico)
- Columna `correo` en `actas_invitados` (capturado en UI, no persiste)
- Validación MIME real del PDF en servidor
- Activar `save_acta_complete` en el cliente (migración SQL lista)
- Cierre de redirect si Supabase Auth sigue apuntando al portal antiguo
- Endurecimiento de métricas según reglas de negocio finales
- **Bucket `evidencias_actas` sigue público** (verificado 2026-07-02, 131 PDFs descargables por URL sin sesión); cerrarlo requiere bucket privado + migrar `getPublicUrl()` → `createSignedUrl()` en `lib/supabase/queries.ts`
- **La planilla maestra sigue legible por `anon`** (contiene correos de directores/representantes); antes de cerrar su SELECT hay que confirmar que `portal-participacion` no la lee sin sesión
- **Validar los 69 correos de la lista blanca de directores** contra las cuentas Google reales antes del lanzamiento; caso ya detectado: RBD `6301401/33879-6` tiene rol para `ximena.lopez@slepcolchagua.cl` pero en Auth existe `ximena.pino@slepcolchagua.cl` sin rol
- Ejecutar el plan de corte de la planilla maestra (§9.x): dejar de invocar los `sync_*_from_base_escuelas` y gestionar accesos solo vía panel admin

> **Nota 2026-07-02:** la auditoría en vivo (ver §9.y) confirmó que las migraciones antes listadas como "aplicar si aún no está corrida" (`20260424_actas_registro_documental`, `20260514_usuario_establecimiento_roles`, `20260526_admin_user_management_rls`, `20260526_colaborador_readonly`, storage `20260619`) **están todas aplicadas en producción** y las funciones RLS viven en su versión final.

---

## 3. Stack Técnico

### Frontend

- Next.js 15 con App Router
- React 19
- TypeScript 5
- Tailwind CSS 3
- Lucide React (iconos)

### Datos y autenticación

- Supabase Auth (Google OAuth)
- Supabase Database (PostgreSQL + RLS)
- Supabase Storage (bucket `evidencias_actas`)
- Consumo 100% client-side desde navegador

### Tooling

- ESLint (configuración Next)
- `serve` para levantar `out/` en producción

### Scripts disponibles

```bash
npm run dev      # desarrollo local
npm run lint     # ESLint
npm run build    # export estático → out/
npm run preview  # serve out/ localmente
npm run start    # alias de preview
```

---

## 4. Decisiones de Arquitectura

### 4.1 Export estático sin Node en producción

```js
// next.config.js
output: "export"
trailingSlash: true
images.unoptimized: true
```

Consecuencias:
- No hay runtime Node en producción
- No se usan API routes ni server actions para data crítica
- El resultado desplegable vive en `out/`
- Auth y data fetch se resuelven en el navegador

**Invariante crítica:** no introducir dependencias de server components para el flujo de datos del portal.

### 4.2 Cliente Supabase en frontend

El cliente se crea en `lib/supabase/client.ts` usando variables públicas `NEXT_PUBLIC_*`. Si faltan en el build, el portal no puede autenticarse ni consultar datos.

### 4.3 Control centralizado de sesión

La app entera cuelga de `PortalAuthProvider` + `AppFrame`, que centraliza:
- Lectura de sesión y suscripción a `onAuthStateChange`
- Carga del perfil y asociación de establecimiento
- Control de loading y acceso
- Redirect entre login y portal autenticado

**Invariante:** no duplicar lógica de sesión fuera de `lib/auth/context.tsx`.

Detalle operativo vigente:
- `selectedRbd` se restaura desde `localStorage` solo para perfiles `ADMIN`
- esa persistencia no debe limpiarse mientras la sesión y el perfil todavía están resolviéndose
- si el usuario no es `ADMIN` o cierra sesión, la selección persistida sí se elimina
- el estado auth persistido en `sessionStorage` no debe aplicarse hasta que `getSession()` confirme el `user.id` actual
- `landingRoute`, scope y perfil cacheados solo pueden rehidratarse si pertenecen a ese mismo usuario

### 4.4 Snapshot de datos como contexto único

`PortalSnapshotProvider` vive en `app-frame.tsx`. Lee una sola vez al autenticar y expone `refresh()` para recargas explícitas. Las páginas solo consumen — nunca hacen fetch propio.

**Invariante:** las páginas no deben tener `useEffect` para cargar datos del portal — siempre usar `usePortalSnapshot()`.

### 4.4.1 Resiliencia ante remounts y export estático

Hallazgo validado el 2026-05-12:
- en este portal, navegar entre rutas puede seguir disparando remounts efectivos de providers o rehidrataciones parciales aunque la transición visual siga siendo client-side
- por eso un caché solo en memoria no es suficiente para auth, snapshot compartido ni directorio SLEP
- el síntoma observable fue skeleton al cambiar de módulo y repetición de consultas base a Supabase (`usuarios_perfiles`, `establecimientos`, `programacion`, `actas`, `actas_invitados`, `get_current_portal_scope`, `get_slep_directorio`)

Patrón correcto vigente:
- `lib/supabase/client.ts` debe exponer un singleton browser client
- `lib/auth/context.tsx` debe hidratar y persistir estado suficiente para no re-bootstrapear acceso en cada remount, pero siempre validándolo contra el usuario autenticado real antes de reutilizarlo
- `lib/hooks/use-portal-snapshot.tsx` debe reutilizar caché persistido, deduplicar requests en vuelo por `userId + selectedRbd` y revalidar cuando la versión global del snapshot cambie tras una mutación
- `lib/hooks/use-slep-directorio.ts` debe compartir caché por usuario, deduplicar requests en vuelo y complementar la RPC con `establecimientos` cuando el directorio base no traiga una escuela válida
- las rutas internas del shell deben mantenerse con slash final consistente (`/resumen/`, `/programacion/`, `/actas/`, `/metricas/`, `/admin/`)

Hallazgo adicional validado el 2026-05-12:
- puede existir un acta válida en `actas` y una escuela válida en `establecimientos`, pero aun así no verla en `/admin/` si `get_slep_directorio()` no la retorna
- ese desacople también puede distorsionar `/metricas/` si el navegador sigue sirviendo un snapshot persistido anterior a la mutación reciente
- caso observado: una escuela podía figurar con acta registrada en `/actas/`, seguir apareciendo como faltante en `/metricas/` y no ser encontrable en `/admin/`

Regla operativa vigente:
- para diagnosticar inconsistencias de escuelas o cumplimiento, contrastar siempre `actas`, `establecimientos`, `get_slep_directorio()` y el estado del snapshot cacheado; no asumir que una sola fuente representa toda la verdad operativa

**No volver a repetir:**
- no crear clientes Supabase nuevos dentro de hooks, providers o helpers de lectura frecuente
- no confiar solo en `useState` o variables de módulo en memoria cuando el dato debe sobrevivir a remounts del árbol autenticado
- no rehidratar estado auth persistido de un usuario previo antes de que Supabase confirme la sesión actual; ese error puede producir redirects inválidos o retorno al login
- no introducir fetch directo por página para datos base del portal si ya existen `PortalAuthProvider`, `PortalSnapshotProvider` o `useSlepDirectorio`
- no asumir que `get_slep_directorio()` contiene por sí sola todo el catálogo visible; si una escuela existe en `establecimientos`, el frontend no debe ocultarla del admin o del selector
- no dejar mutaciones de actas o programación sin invalidar el snapshot compartido; de lo contrario, `/metricas/` puede seguir mostrando cumplimiento viejo aunque el acta ya exista
- no romper la canonicalización con `trailingSlash: true` usando enlaces internos mezclados entre rutas con y sin slash final
- no reintroducir loading global que desmonte el shell completo mientras auth o snapshot ya tienen datos válidos en caché

### 4.4.2 Programación y correlativos

La numeración de `programacion` no debe resolverse como fuente de verdad en cliente. El correlativo oficial sale de `get_next_session_number(session_type, establishment_rbd, target_year)`, considerando tanto filas en `programacion` como actas ya realizadas del mismo `rbd`, `tipo_sesion` y año.

Detalle vigente:
- las sesiones ordinarias siguen limitadas a 4 por año y RBD
- editar una programación puede conservar o recalcular su `numero_sesion` según cambie tipo/año
- al guardar un acta desde una programación, `programacion.acta_vinculada_id` se actualiza y la sesión queda en estado `REALIZADA`

**Invariante:** cualquier flujo nuevo que cree, edite o migre programaciones debe pasar por la RPC de correlativo o respetar explícitamente el `numero_sesion` ya validado.

### 4.5 Estabilidad de layout durante navegación

`app/loading.tsx` fue eliminado deliberadamente. Este archivo creaba un Suspense boundary automático en App Router que mostraba un spinner vacío en cada navegación entre páginas, causando la sensación de "salir y volver a entrar".

Además, `AppFrame` fue reestructurado para que `PortalSnapshotProvider` envuelva **todas** las ramas autenticadas. Con el esquema anterior, si `isLoading` era `true` aunque fuera un frame, todo el shell (incluyendo el sidebar) se desmontaba.

**Invariante:** no volver a agregar `app/loading.tsx` a nivel del directorio `app/`. Si se necesita un indicador de carga específico para una ruta, debe hacerse dentro del `page.tsx` correspondiente con el patrón de skeleton ya establecido.

Complemento importante tras el hallazgo 2026-05-12:
- aunque no exista `app/loading.tsx`, el portal puede volver a mostrar estados de carga si auth o snapshot pierden su estado efectivo
- por eso la estabilidad visual depende tanto del layout como de la persistencia y deduplicación de los providers de datos

---

## 5. Estructura Relevante

### Rutas principales

| Ruta | Descripción |
|---|---|
| `/` | Landing pública informativa sobre Consejos Escolares (sin sesión) |
| `/terminos/` | Términos y Condiciones (pública) |
| `/privacidad/` | Política de Privacidad (pública) |
| `/cookies/` | Política de Cookies (pública) |
| `/auth/login/` | Pantalla de acceso + callback OAuth |
| `/resumen/` | Resumen autenticado |
| `/programacion/` | Planificación de sesiones |
| `/actas/` | Actas y revisión |
| `/metricas/` | Indicadores |

### Modalidades de acta

`/actas/` opera ahora con dos modalidades sobre la misma entidad `actas`:

- `ACTA_COMPLETA`: formulario estructurado actual con asistencia, acuerdos y desarrollo
- `REGISTRO_DOCUMENTAL`: inicio de correlativo operativo con datos generales + documento adjunto obligatorio

Cobertura operativa vigente:

- durante 2026 el esquema híbrido aplica a las 4 comunas del portal
- una misma comuna o establecimiento puede convivir entre `ACTA_COMPLETA` y `REGISTRO_DOCUMENTAL` según madurez operativa de cada sesión
- no se requiere habilitación diferenciada por comuna para usar el modo documental en frontend

Invariantes operativas:

- ambas modalidades comparten correlativo por `rbd + tipo_sesion`
- `REGISTRO_DOCUMENTAL` debe tener `link_acta`
- `REGISTRO_DOCUMENTAL` puede omitir horario detallado y contenido estructurado
- la evolución futura debe convertir un registro documental en uno completo sin duplicar sesión

### Archivos clave

| Archivo | Rol |
|---|---|
| `app/layout.tsx` | Layout global, fuente local, `<Toaster>` |
| `app/globals.css` | Fondo global, estilos base, `@media print` |
| `app/auth/login/page.tsx` | Callback explícito de Supabase |
| `app/page.tsx` | Monta la landing pública (`LandingPage`) |
| `components/landing/landing-page.tsx` | Landing pública: header, hero, secciones informativas, footer |
| `components/landing/legal-page.tsx` | Layout compartido de páginas legales |
| `app/terminos/page.tsx`, `app/privacidad/page.tsx`, `app/cookies/page.tsx` | Contenido legal |
| `app/actas/page.tsx` | Listado de actas con búsqueda, filtros y acciones |
| `components/auth/auth-screen.tsx` | UI de acceso actual |
| `components/portal/app-frame.tsx` | Guard, redirecciones, `PortalSnapshotProvider` |
| `components/portal/shell.tsx` | Shell autenticado con `SchoolSelector` |
| `components/portal/acta-form.tsx` | Drawer de creación/edición de actas |
| `components/portal/acta-detail.tsx` | Vista de solo lectura + impresión |
| `components/portal/confirm-dialog.tsx` | Modal de confirmación reutilizable |
| `components/portal/data-banner.tsx` | Banner de error (solo errores reales) |
| `components/ui/toast.tsx` | Sistema de toasts global |
| `components/ui/button.tsx` | Botón base con variantes `primary`, `secondary`, `ghost` |
| `components/ui/badge.tsx` | Badge con tones |
| `lib/auth/context.tsx` | Sesión, perfil, establecimiento, auth flow |
| `lib/supabase/queries.ts` | `fetchPortalSnapshot`, mutaciones de `programacion`, `upsertActa`, `replaceActaInvitados`, uploads, delete e invalidación de versión del snapshot |
| `lib/hooks/use-portal-snapshot.tsx` | Context Provider + `usePortalSnapshot()` hook con caché versionado |
| `lib/hooks/use-slep-directorio.ts` | Hook → RPC `get_slep_directorio()` con fallback a `establecimientos` |
| `types/domain.ts` | Tipos de dominio: `Acta`, `Profile`, `Establishment`, etc. |
| `tailwind.config.ts` | Tokens visuales del portal |
| `supabase/migrations/` | Historial de migraciones SQL |

### Mapa rápido para mejoras (guía para IA)

Usar esta sección como mapa operativo para ubicar rápido dónde tocar según el tipo de mejora.

| Quieres cambiar... | Empieza en... | Apoyo secundario |
|---|---|---|
| Landing pública, contenido informativo, páginas legales | `components/landing/landing-page.tsx` | `components/landing/context-landing.md`, `components/landing/legal-page.tsx`, `app/globals.css` |
| Login, OTP, magic link, sesión | `components/auth/auth-screen.tsx` | `lib/auth/context.tsx`, `app/auth/login/page.tsx` |
| Redirecciones y guardias globales | `components/portal/app-frame.tsx` | `lib/auth/context.tsx` |
| Navegación lateral, logo, selector de escuela, header contextual | `components/portal/shell.tsx` | `lib/hooks/use-slep-directorio.ts`, `lib/auth/context.tsx` |
| Persistencia de escuela seleccionada | `lib/auth/context.tsx` | `components/portal/shell.tsx`, `lib/hooks/use-portal-snapshot.tsx` |
| Precarga de establecimiento activo en nueva acta | `components/portal/acta-form.tsx` | `lib/auth/context.tsx`, `lib/hooks/use-slep-directorio.ts`, `app/actas/page.tsx` |
| Resumen del establecimiento | `app/resumen/page.tsx` | `components/portal/section-card.tsx`, `components/portal/attendance-chart.tsx` |
| Programación, calendario y acciones operativas | `app/programacion/page.tsx` | `components/portal/acta-form.tsx`, `lib/supabase/queries.ts` |
| Métricas y visualizaciones | `app/metricas/page.tsx` | `components/portal/attendance-chart.tsx`, `components/portal/section-card.tsx` |
| Panel admin y directorio SLEP | `app/admin/page.tsx` | `lib/hooks/use-slep-directorio.ts`, `lib/supabase/queries.ts`, `types/domain.ts` |
| Gestión de usuarios del portal | `app/admin/usuarios/page.tsx` | `app/admin/context-usuarios.md`, `lib/supabase/queries.ts`, `lib/auth/context.tsx`, `types/domain.ts` |
| Listado, filtro y flujo de actas | `app/actas/page.tsx` | `components/portal/acta-form.tsx`, `components/portal/acta-detail.tsx`, `lib/supabase/queries.ts` |
| Formularios y persistencia de borradores | `components/portal/acta-form.tsx` | `components/ui/button.tsx`, `components/ui/toast.tsx` |
| Modal de confirmación | `components/portal/confirm-dialog.tsx` | `components/ui/button.tsx` |
| Estilos globales, skeletons, animaciones base | `app/globals.css` | `tailwind.config.ts` |
| Sistema visual de cards y bloques | `components/portal/section-card.tsx` | `components/portal/stat-card.tsx`, `tailwind.config.ts` |
| Botones, badges, toasts | `components/ui/button.tsx` | `components/ui/badge.tsx`, `components/ui/toast.tsx` |
| Fetch de snapshot portal | `lib/hooks/use-portal-snapshot.tsx` | `lib/supabase/queries.ts` |
| Consultas, mutaciones y uploads Supabase | `lib/supabase/queries.ts` | `lib/supabase/client.ts` |
| Directorio filtrado de escuelas | `lib/hooks/use-slep-directorio.ts` | `supabase/migrations/20260514_consejos_usuario_establecimiento_roles.sql`, `supabase/migrations/20260526_consejos_colaborador_readonly.sql`, `establecimientos` |
| Roles, RLS, bootstrap y permisos | `supabase/migrations/20260514_consejos_usuario_establecimiento_roles.sql` | `supabase/migrations/20260526_consejos_admin_user_management_rls.sql`, `supabase/migrations/20260526_consejos_colaborador_readonly.sql`, `supabase/migrations/20260416_consejos_fix_rls_recursion.sql` |

### Mapa por carpetas

`app/`
- routing y páginas del portal
- cada subcarpeta representa una vista principal
- `layout.tsx` y `globals.css` controlan la experiencia global

`components/portal/`
- shell autenticado, tablas, cards, gráficos y vistas de negocio
- aquí viven casi todas las mejoras visuales reutilizables del portal autenticado

`components/ui/`
- primitivas visuales base reutilizadas por todo el proyecto

`components/auth/`
- experiencia de entrada y autenticación

`lib/supabase/`
- contexto de auth, hooks de datos y consultas/mutaciones al backend
- si algo “se resetea”, “no carga” o “pierde contexto”, casi siempre revisar aquí primero

`supabase/migrations/`
- fuente de verdad del comportamiento de permisos, bootstrap y RPC SQL
- la definición efectiva vigente de acceso por correo/RBD/rol está en `20260514_consejos_usuario_establecimiento_roles.sql`, complementada por `20260526_consejos_admin_user_management_rls.sql` y `20260526_consejos_colaborador_readonly.sql`
- cualquier mejora de acceso o filtrado debe documentarse aquí y en este `context.md`

`types/`
- contratos de dominio que conectan frontend con la forma de los datos

### Rutas de trabajo frecuentes

Ruta 1 — mejorar navegación admin:
- `components/portal/shell.tsx`
- `lib/auth/context.tsx`
- `lib/hooks/use-slep-directorio.ts`

Ruta 2 — mejorar paneles visuales y consistencia:
- `node_modules/@slep-colchagua/design-system/INSTRUCCIONES_DISENO.md` (fuente de verdad del DS)
- `app/colors_and_type.css` (tokens CSS)
- `tailwind.config.ts` (tokens en clases Tailwind)
- `app/globals.css` (utilidades base, skeletons, hero-grid)
- `components/portal/section-card.tsx`
- `components/ui/button.tsx`

Ruta 3 — mejorar experiencia de datos por establecimiento:
- `lib/hooks/use-portal-snapshot.tsx`
- `lib/supabase/queries.ts`
- `app/resumen/page.tsx`
- `app/programacion/page.tsx`
- `app/metricas/page.tsx`

Ruta 4 — mejorar actas:
- `app/actas/page.tsx`
- `components/portal/acta-form.tsx`
- `components/portal/acta-detail.tsx`
- `lib/supabase/queries.ts`

Ruta 5 — mejorar permisos o acceso por correo:
- `supabase/migrations/20260514_consejos_usuario_establecimiento_roles.sql`
- `lib/auth/context.tsx`
- `lib/hooks/use-slep-directorio.ts`

### Migraciones SQL relevantes

| Archivo | Contenido |
|---|---|
| `20260415_consejos_escolares.sql` | Esquema base: tablas, tipos, RLS iniciales |
| `20260416_consejos_fix_rls_recursion.sql` | Fix crítico de recursión infinita en RLS |
| `20260416_consejos_auth_bootstrap_from_base.sql` | Bootstrap de perfil desde base maestra |
| `20260416_consejos_public_read_anon.sql` | Escenario heredado de lectura anon (inactivo) |
| `20260417_slep_directorio_fn.sql` | RPC `get_slep_directorio()` |
| `20260417_sync_establecimientos_full.sql` | Sincronización completa de establecimientos |
| `20260418_save_acta_atomic.sql` | RPC `save_acta_complete` (transacción atómica) |
| `20260424_consejos_actas_registro_documental.sql` | Extiende `actas` para modo híbrido documental y horarios nullable |
| `20260424_consejos_representante_scope.sql` | Primera versión del alcance por representante; reemplazada operacionalmente por `20260514_consejos_usuario_establecimiento_roles.sql` |
| `20260514_consejos_usuario_establecimiento_roles.sql` | Tabla única `usuario_establecimiento_roles`, sync desde base maestra, bootstrap y RLS por alcance |
| `20260526_consejos_reassert_storage_evidencias_scope.sql` | Reimpone RLS de `storage.objects` para `evidencias_actas` usando `has_school_scope_access()` |
| `20260526_consejos_storage_scope_normalized_rbd.sql` | Crea `has_school_scope_access_storage_key()` con normalización de RBD (`/`↔`-`) y la asigna a las cuatro políticas de `evidencias_actas`; función base requerida por `20260619` |
| `20260619_consejos_storage_write_allow_representante_domain.sql` | **Fix definitivo de storage** — revierte las cuatro políticas de `evidencias_actas` a `has_school_scope_access_storage_key()`; corrige la regresión de `20260608` donde uploads fallaban en el storage service de Supabase pese a datos correctos |
| `20260702_consejos_close_anon_actas_and_base_escuelas_write.sql` | **Ya aplicada en producción (2026-07-02)** — elimina la lectura `anon` de `actas` (lectura solo con sesión autenticada), restringe UPDATE/INSERT de `BASE DE DATOS ESCUELAS SLEP` a editores legítimos vía `is_base_escuelas_editor()` (roles `admin/coordinador/fi/be` de `auth_users_roles` + admin global Consejos), y desactiva la fila ADMIN con typo `camilo.serra@slepcolchagua.c` |

---

## 6. Variables de Entorno

| Variable | Propósito |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Endpoint del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave pública para el cliente browser |
| `NEXT_PUBLIC_APP_NAME` | Nombre de app para metadata |
| `NEXT_PUBLIC_SITE_URL` | URL base para construir el redirect del magic link |

> `.env.example` es solo plantilla. El build toma `.env.local` o variables del pipeline — y **`.env.local` tiene prioridad sobre `.env`** (orden de Next.js). Un build sin `NEXT_PUBLIC_SITE_URL` construirá el redirect desde `window.location.origin` en cliente.

> **Lección del incidente 2026-07-08 (ver Avance 21):** las variables `NEXT_PUBLIC_*` quedan horneadas como literales dentro de los chunks JS al compilar. Cambiar el `.env` local NO afecta un build ya desplegado; y un typo en el entorno de build (caso real: `supabase.com` en vez de `.co` en el servidor) viaja invisible dentro del bundle. Ante fallas inexplicables en producción, verificar los literales del bundle desplegado (`grep` sobre `/_next/static/chunks/`) contra el repo.

---

## 7. Flujo de Autenticación

### 7.1 Solicitud de acceso

`sendOtp(email)` en `lib/auth/context.tsx`:
1. Normaliza correo a minúsculas
2. Construye redirect con `resolveOtpRedirectUrl()` → apunta a `/auth/login/`
3. Llama `supabase.auth.signInWithOtp({ shouldCreateUser: false, emailRedirectTo })`

El usuario debe existir en Supabase Auth. El portal no crea usuarios arbitrariamente.

### 7.2 Persistencia temporal del correo

`AuthScreen` guarda el correo en `localStorage` con clave `consejos.auth.email` para recuperar el paso de verificación tras un refresco.

### 7.3 Callback explícito

`app/auth/login/page.tsx` procesa dos formatos de Supabase:
- `code` → `exchangeCodeForSession(code)`
- `token_hash + type` → `verifyOtp({ token_hash, type })`

Luego limpia los parámetros con `history.replaceState`.

### 7.4 Carga de sesión y resolución de acceso

`PortalAuthProvider`:
1. `auth.getSession()` + suscripción a `onAuthStateChange`
2. Carga `usuarios_perfiles`; si no existe, ejecuta `bootstrap_current_user_profile_from_base_escuelas()`
3. Si `profile.rbd` existe, consulta `establecimientos`
4. `useEffect` depende de `userId` (no de `session` completa) para evitar re-renders por renovación de JWT

Desde 2026-05-26 el bootstrap y la resolución de scope admiten cuatro casos sobre la tabla única `usuario_establecimiento_roles`:
- correo con fila `rol = 'ADMIN'` y `rbd = null` → `ADMIN` global
- correo con fila `rol = 'COLABORADOR'` y `rbd = null` → acceso global de solo lectura
- correo presente en `CORREO REPRESENTANTE` sincronizado a `rol = 'REPRESENTANTE'` por RBD → navegación administrativa con alcance limitado a sus escuelas
- correo de director en `CORREO ELECTRÓNICO` sincronizado a `rol = 'DIRECTOR'` por RBD → `DIRECTOR` con un solo RBD

`get_current_portal_scope()` ahora expone además:
- `is_read_only`: verdadero para colaborador global
- `can_manage_users`: verdadero solo para admin global

### 7.5 Redirecciones en AppFrame

| Condición | Acción |
|---|---|
| Ruta pública (`/`, `/auth/login/`, `/terminos/`, `/privacidad/`, `/cookies/`) | Renderiza siempre, con o sin sesión |
| Sin sesión + ruta protegida | Redirige a `/auth/login/` |
| Con sesión + `/auth/login/` | La propia página de login redirige a `landingRoute` |
| Resolviendo sesión (ruta protegida) | Estado de loading |
| Sesión ok + falla perfil/establecimiento | Tarjeta de error de acceso |

### 7.6 Restricción pendiente fuera del código

Si el correo sigue abriendo el portal antiguo, la causa está en la **configuración de Supabase Auth** (Site URL, Redirect URLs, posible plantilla hardcodeada) — no en el código del frontend.

---

## 8.1 Avances 2026-04-24

### Avance 1 — Selector de escuela con búsqueda

Se actualizó `SchoolSelector` para que el usuario pueda escribir dentro del dropdown y filtrar por:
- nombre de establecimiento
- RBD
- comuna
- director
- representante

Comportamiento actual:
- seleccionar una escuela redirige a `/resumen/`
- limpiar la selección redirige a `/admin/`
- el listado visible ya no depende de un catálogo global en cliente, sino del alcance entregado por Supabase

### Avance 2 — Acceso unificado por correo, rol y RBD

La definición efectiva vigente quedó en `20260514_consejos_usuario_establecimiento_roles.sql` con este objetivo:
- centralizar el acceso en la tabla única `usuario_establecimiento_roles`
- usar `RBD` como identificador único para cruzar datos operativos y de escuela
- sincronizar directores desde `DIRECTOR/A` + `CORREO ELECTRÓNICO`
- sincronizar representantes desde `REPRESENTANTE CONSEJO ESCOLAR` + `CORREO REPRESENTANTE`
- permitir admins globales desde filas `rol = 'ADMIN'` sin `rbd`
- permitir colaboradores globales desde filas `rol = 'COLABORADOR'` sin `rbd`

Funciones nuevas o redefinidas:
- `is_global_admin()`
- `has_global_readonly_access()`
- `current_accessible_rbds()`
- `has_school_scope_access(target_rbd)`
- `has_school_write_access(target_rbd)`
- `is_admin()` ahora equivale a admin global, no a representante con alcance parcial
- `bootstrap_current_user_profile_from_base_escuelas()` ahora contempla admin global, colaborador, representante y director

Detalle adicional del criterio vigente:
- `is_global_admin()` ya no depende de `usuarios_perfiles`; lee `usuario_establecimiento_roles`
- `current_accessible_rbds()` devuelve todos los `RBD` para admin global y colaborador global, y solo los `RBD` asignados para representante/director
- `has_school_scope_access()` se usa para lectura; `has_school_write_access()` se usa para mutaciones y storage write
- `bootstrap_current_user_profile_from_base_escuelas()` crea `usuarios_perfiles` como proyección de la tabla única, no como fuente de verdad del alcance

### Avance 3 — Endurecimiento de RLS por alcance y por capacidad de escritura

Se reemplazó la lógica que daba acceso global a todo `rol = 'ADMIN'` por una verificación explícita de RBD accesibles y, desde 2026-05-26, por una separación explícita entre lectura y escritura.

Tablas y superficies endurecidas:
- `establecimientos`
- `programacion`
- `actas`
- `actas_invitados`
- `logs`
- `storage.objects` para bucket `evidencias_actas`
- RPC `get_slep_directorio()`

Resultado vigente:
- `COLABORADOR` puede leer todo el alcance del portal, pero no escribir
- `ADMIN` mantiene lectura y escritura global, además de gestión de usuarios
- representantes y directores escriben solo dentro de sus `RBD` autorizados

Resultado esperado:
- un representante puede entrar con perfil administrativo de navegación
- pero solo puede ver o mutar datos de sus escuelas asociadas
- admin global puede además seleccionar cualquier escuela activa y entrar a su perfil y datos operativos

### Avance 4 — Validación técnica realizada

Validaciones ejecutadas tras el cambio:
- `npm run lint`
- `npm run build`

Resultado:
- frontend sin errores de lint
- compilación Next.js exitosa
- sin errores de TypeScript en `components/portal/shell.tsx`

### Avance 5 — Nota sobre recursión infinita en RLS

El cambio nuevo mantiene el patrón correcto para evitar recursión infinita:
- las funciones usadas por políticas (`is_global_admin`, `current_accessible_rbds`, `has_school_scope_access`, `is_admin`) están definidas como `SECURITY DEFINER`
- la política no consulta directamente `usuarios_perfiles` como invocador normal
- por eso no se reabre el ciclo clásico `policy -> función -> usuarios_perfiles -> policy`

Salvedad operativa:
- esto asume el comportamiento estándar de Supabase sin `FORCE ROW LEVEL SECURITY` sobre las tablas involucradas

### Avance 6 — Ajuste visual del shell principal

Se actualizó la estructura visual del portal autenticado para aprovechar mejor el ancho de pantalla:
- se eliminó el tope `max-width` del shell principal
- se amplió la barra lateral en escritorio para mejorar lectura y jerarquía
- el contenido principal ahora tiene mejor expansión horizontal y `min-w-0` para evitar cortes indeseados
- la marca textual del menú fue reemplazada por el logo institucional `public/SLEPCOLCHAGUA.webp`

Resultado esperado:
- mejor uso de pantallas grandes
- navegación lateral más institucional
- mayor sensación de producto terminado y menos de layout encajonado

### Avance 7 — Mejoras UI/UX implementadas (selección de propuestas)

Se implementó un segundo pase visual sobre shell, componentes base y páginas principales para cubrir estas propuestas seleccionadas:
- `1` encabezado superior contextual dentro del panel principal
- `2` barra lateral con mayor jerarquía visual
- `3` escuela activa destacada con mejor tarjeta contextual
- `6` mejor reparto de ancho y lectura en contenedores principales
- `7` unificación de radios, sombras y densidad visual en cards y bloques
- `14` skeleton loaders en vistas clave
- `16` tablas con cabecera sticky y zebra suave
- `18` jerarquía visual reforzada en botones
- `20` microanimaciones discretas de entrada y hover
- `23` vista enfocada para secciones operativas de tabla

Archivos intervenidos en este pase:
- `components/portal/shell.tsx`
- `components/portal/section-card.tsx`
- `components/portal/session-table.tsx`
- `components/portal/attendance-chart.tsx`
- `components/ui/button.tsx`
- `app/globals.css`
- `app/resumen/page.tsx`
- `app/programacion/page.tsx`
- `app/metricas/page.tsx`
- `app/admin/page.tsx`

Trabajo realizado por archivo:

`components/portal/shell.tsx`
- se agregó un header contextual superior en el contenido principal
- se reforzó la jerarquía de la barra lateral
- se mejoró el estado activo de navegación con acento lateral y señal visual más fuerte
- se enriqueció la tarjeta de contexto del establecimiento activo

`components/portal/section-card.tsx`
- se unificó el patrón de card compartida
- se mejoró encabezado interno, separación visual y sombra

`components/portal/session-table.tsx`
- se mejoró la tabla con zebra suave
- se dejó la cabecera preparada como sticky
- se reforzó la lectura de estados y densidad operativa

`components/portal/attendance-chart.tsx`
- se agregó estado vacío más profesional
- se mejoró la presentación visual de cada barra y su transición

`components/ui/button.tsx`
- se elevó la diferencia entre botón primario, secundario y ghost
- se agregaron mejores estados hover y focus

`app/globals.css`
- se añadieron animaciones suaves (`panel-reveal`)
- se añadió utilidad de skeleton (`skeleton-shimmer`)

`app/resumen/page.tsx`
- se agregó skeleton de carga
- se mejoró la presencia visual del hero y tarjetas derivadas

`app/programacion/page.tsx`
- se agregó skeleton de carga
- se incorporó una banda de “vista enfocada” para reducir ruido alrededor de la tabla
- se encapsuló la tabla en un contenedor operativo con scroll vertical

`app/metricas/page.tsx`
- se agregó skeleton de carga
- se mejoró la respuesta visual de cards territoriales

`app/admin/page.tsx`
- se agregó skeleton de carga para KPI, resumen territorial y tabla del directorio
- se mejoró la tabla con scroll vertical y cabecera sticky

### Avance 8 — Persistencia de escuela seleccionada

Se corrigió el problema donde el dropdown de escuela del menú lateral perdía la selección al navegar entre páginas o al rehidratar el portal.

Archivo intervenido:
- `lib/auth/context.tsx`

Trabajo realizado:
- se agregó una clave `localStorage` para `selectedRbd`
- el valor se restaura al inicializar `PortalAuthProvider`
- la persistencia solo se mantiene para perfiles `ADMIN`
- al cerrar sesión o al entrar con un perfil no admin, la selección persistida se limpia

Resultado esperado:
- la escuela activa permanece seleccionada al cambiar entre `/resumen`, `/programacion`, `/actas` y `/metricas`
- se evita que el portal vuelva a estado “sin escuela” entre secciones del flujo admin

Detalle técnico del fix:
- la sincronización con `localStorage` ya no limpia `selectedRbd` mientras `profile` todavía es `null` durante la carga inicial
- eso evita el race donde el selector mostraba una escuela, la navegación redirigía a `/resumen/`, y luego el contexto quedaba nuevamente sin escuela activa

### Avance 9 — Dropdown acotado por representante autenticado

Se reforzó el comportamiento para que el menú de navegación no dependa solo del rol `ADMIN`, sino también del alcance real del usuario autenticado.

Archivos intervenidos:
- `lib/auth/context.tsx`
- `lib/hooks/use-slep-directorio.ts`

Trabajo realizado:
- se agregó `isGlobalAdmin` al contexto de autenticación
- `lib/auth/context.tsx` consulta la RPC `is_global_admin()` cuando el perfil autenticado es `ADMIN`
- `use-slep-directorio.ts` aplica una segunda barrera en cliente:
  - si el usuario es admin global, ve todas las escuelas disponibles
  - si el usuario es `ADMIN` pero no global, solo ve escuelas cuyo `correo_representante` coincide con su `correo_electronico`

Resultado esperado:
- integrantes del equipo definidos como admin global siguen viendo todos los colegios
- si una persona entra con Google y solo hace match como representante, el dropdown del menú solo habilita las escuelas que le corresponden
- el comportamiento queda alineado con el correo autenticado en sesión y no solo con el hecho de tener navegación administrativa

### Avance 10 — Panel general alineado al alcance territorial

Se ajustó la experiencia del panel admin para que la vista agregada también respete el alcance del usuario cuando no es admin global.

Archivos intervenidos:
- `components/portal/shell.tsx`
- `app/admin/page.tsx`

Trabajo realizado:
- el menú lateral ahora cambia la etiqueta de `/admin` a `Mi Territorio` cuando el usuario no es admin global
- el header contextual deja de comunicar “cobertura completa” para usuarios acotados y muestra cobertura asignada o colaboración global según corresponda
- la página `/admin` cambia su título, descripción y copy para reflejar que la vista agregada está limitada a escuelas/comunas autorizadas
- se agregó un banner explicativo en el panel admin para usuarios con cobertura parcial
- el colaborador global ahora ve copy específico de solo lectura y ya no se etiqueta como “territorio asignado”

Resultado esperado:
- el “panel general” ya no se interpreta como acceso a todo para representantes
- la vista agregada sigue existiendo, pero solo sobre las escuelas y territorios habilitados al correo autenticado

### Avance 11 — Tipo de acceso visible en sidebar

Se agregó una señal explícita en la barra lateral para que el usuario vea inmediatamente qué nivel de acceso tiene dentro del portal.

Archivo intervenido:
- `components/portal/shell.tsx`

Trabajo realizado:
- se agregó un bloque visual encima del selector de escuela para perfiles `ADMIN`
- el bloque muestra el tipo de acceso actual:
  - `Administrador global`
  - `Colaborador global`
  - `Cobertura asignada`
- se incorporó un `Badge` de apoyo visual:
  - `Admin global`
  - `Solo lectura`
  - `Alcance parcial`
- se añadió texto contextual para explicar el efecto práctico del permiso actual

Resultado esperado:
- el usuario entiende desde el sidebar si tiene visibilidad total o solo territorial
- se reduce la ambigüedad entre admin global y representante con acceso acotado

Resultado esperado de esta iteración:
- navegación más clara y profesional
- mejor lectura en monitores grandes
- mejor transición percibida durante carga y navegación
- tablas más utilizables en operación diaria
- sistema visual más consistente entre módulos

### Avance 12 — Precarga del establecimiento activo en Nueva acta

Se ajustó el drawer de creación de actas para que, cuando el portal ya tiene una escuela activa, el formulario se abra con esa información precargada.

Archivos intervenidos:
- `components/portal/acta-form.tsx`
- `app/actas/page.tsx`
- `lib/auth/context.tsx`

Trabajo realizado:
- `ActaForm` ahora toma `selectedRbd`, `profile.rbd` y `establishment` desde `PortalAuthProvider`
- al abrir `Nueva acta`, si no se está editando un registro existente, el formulario rellena automáticamente:
  - `rbd`
  - `nombre_establecimiento`
  - `direccion`
  - `comuna`
- el número de sesión inicial también se recalcula para el establecimiento activo
- si el directorio SLEP o el establecimiento terminan de cargar después de abrir el drawer, el formulario completa esos datos en cuanto estén disponibles

Resultado esperado:
- si el usuario ya está trabajando sobre una escuela activa, no necesita volver a seleccionarla dentro del formulario de acta
- el flujo queda alineado con la experiencia esperada para directores que operan siempre dentro de su propio establecimiento
- se reduce el riesgo de crear un acta asociada al RBD incorrecto por omisión manual

### Avance 13 — Modelo híbrido de actas para las 4 comunas

Se implementó la fase 1 del esquema híbrido para operar durante 2026 con sesiones que pueden iniciar como acta completa o como registro documental sin abrir subsistemas separados.

Archivos intervenidos:
- `types/domain.ts`
- `components/portal/acta-form.tsx`
- `components/portal/acta-detail.tsx`
- `app/actas/page.tsx`
- `app/metricas/page.tsx`
- `lib/supabase/queries.ts`
- `lib/hooks/use-portal-snapshot.tsx`
- `supabase/migrations/20260418_save_acta_atomic.sql`
- `supabase/migrations/20260424_consejos_actas_registro_documental.sql`

Trabajo realizado:
- se agregó `ActaRecordMode = "ACTA_COMPLETA" | "REGISTRO_DOCUMENTAL"`
- `actas` ahora soporta `modo_registro` y `observacion_documental`
- `hora_inicio` y `hora_termino` pasan a ser nullable para registros documentales
- el formulario permite alternar entre modo completo y documental
- en modo documental se exige respaldo adjunto y se omite el bloque estructurado de asistencia/desarrollo
- listado, detalle, snapshot y métricas reconocen ambos modos sobre la misma entidad `actas`

Resultado esperado:
- el portal sostiene un correlativo único por sesión aunque parte del histórico siga entrando con PDF y metadatos mínimos
- durante 2026 las 4 comunas pueden convivir entre captura completa y documental sin configuración diferenciada en frontend

### Avance 14 — Métricas y lectura operativa por tipo de registro

Se separó la lectura de actas para distinguir claramente entre sesiones completamente sistematizadas y registros documentales de transición.

Archivos intervenidos:
- `app/metricas/page.tsx`
- `app/actas/page.tsx`
- `lib/hooks/use-portal-snapshot.tsx`
- `lib/supabase/queries.ts`

Trabajo realizado:
- se agregaron contadores `actasCompletas`, `registrosDocumentales` y `porcentajeCompletas`
- el snapshot expone `actasByMode`
- `/actas/` ahora filtra por `modo_registro`
- el buscador de actas también considera `observacion_documental`
- el listado muestra badge visual para diferenciar documental vs completa

Resultado esperado:
- el seguimiento de avance ya no mezcla sesiones completas con ingresos documentales mínimos
- se puede medir transición operativa sin perder trazabilidad del correlativo

### Avance 15 — Endurecimiento del flujo de ingreso de actas

Se corrigieron los falsos negativos del validador de RUT y se endureció el flujo para asistentes presentes y borradores.

Archivos intervenidos:
- `components/portal/acta-form.tsx`
- `components/portal/acta-detail.tsx`
- `types/domain.ts`
- `lib/supabase/queries.ts`

Trabajo realizado:
- se reemplazó la validación de RUT por módulo-11 chileno estándar
- el `rut` del asistente se persiste y se muestra en detalle
- cuando un estamento queda marcado como presente, nombre, RUT válido, correo y modalidad pasan a ser obligatorios
- el borrador ahora se guarda tanto en nuevas actas como en edición, usando clave por acta
- se agregó advertencia `beforeunload` si el formulario está dirty
- el horario en detalle y dominio queda preparado para valores nulos cuando la sesión es documental

Resultado esperado:
- baja el riesgo de rechazar RUT reales por un algoritmo frágil
- el flujo deja de aceptar asistentes presentes sin trazabilidad mínima de identidad y contacto
- el usuario puede retomar una edición interrumpida sin perder avance local

### Avance 18 — Programación real con calendario, edición y puente a actas

Se reemplazó la vista estática de programación por un flujo operativo real conectado a Supabase.

Archivos intervenidos:
- `app/programacion/page.tsx`
- `lib/supabase/queries.ts`
- `components/portal/acta-form.tsx`

Trabajo realizado:
- se agregó calendario mensual con lectura de sesiones por día para el establecimiento activo
- se implementó creación real de programaciones usando inserción en `public.programacion`
- se habilitó edición de programaciones existentes desde la misma pantalla
- se habilitó cancelación lógica de sesiones existentes actualizando `estado = 'CANCELADA'`
- la numeración se resuelve con la RPC `get_next_session_number` y se mantiene coherente con programaciones y actas ya creadas
- se agregó apertura de `ActaForm` desde una programación concreta, precargando `rbd`, `tipo_sesion`, `numero_sesion`, `fecha`, `hora`, `formato`, `lugar` y `tematicas`
- al guardar el acta, `upsertActa` actualiza la programación de origen dejando `acta_vinculada_id` y `estado = 'REALIZADA'`

Resultado esperado:
- cada director puede calendarizar sus sesiones directamente desde `/programacion/`
- una sesión programada puede pasar a acta sin reingresar los datos base
- la tabla de programación refleja sesiones `PROGRAMADA`, `REALIZADA` y `CANCELADA` con continuidad correcta del correlativo

### Avance 17 — Corrección de flash de navegación entre secciones

Se corrigió el problema donde cambiar de sección (ej. `/actas` → `/programacion`) borraba todo el contenido visualmente, dejaba solo el fondo y luego recargaba la información.

Causas identificadas:

1. **`app/loading.tsx`** — Next.js App Router lo usa como Suspense boundary automático global. En cada navegación client-side mostraba un spinner vacío mientras cargaba el chunk JS de la nueva ruta, causando la sensación de salir de la página.
2. **`AppFrame` retornando `null` durante `isLoading`** — si el estado de autenticación fluctuaba aunque fuera brevemente (renovación de token, revalidación de sesión), todo el árbol del shell (`PortalSnapshotProvider` + `PortalShell` + sidebar) se desmontaba y re-montaba desde cero.

Archivos intervenidos:
- `app/loading.tsx` → **eliminado**
- `components/portal/app-frame.tsx`
- `components/portal/section-card.tsx` (class `panel-reveal` eliminada)
- `app/resumen/page.tsx` (class `panel-reveal` eliminada del hero)
- `app/programacion/page.tsx` (class `panel-reveal` eliminada de artículos)

Trabajo realizado:
- Se eliminó `app/loading.tsx`. Sin este archivo React concurrent mode mantiene el contenido anterior visible hasta que el nuevo esté listo.
- `PortalSnapshotProvider` fue movido para envolver **todas** las ramas autenticadas como capa exterior, sin importar el estado de `isLoading`. Así nunca se desmonta mientras haya sesión activa.
- Cuando `isLoading` es `true` con sesión activa, `AppFrame` ahora muestra un skeleton de dos columnas (sidebar + main) en lugar de `null`, manteniendo la estructura visual estable.
- Se eliminó la clase `panel-reveal` (animación `opacity: 0 → 1` + `translateY`) de `SectionCard`, del hero de resumen y de los artículos de programación, ya que esa animación se disparaba en cada navegación agravando la sensación de recarga.

Resultado esperado:
- La navegación entre `/resumen`, `/programacion`, `/actas`, `/metricas` y `/admin` es instantánea y sin flash visual.
- El sidebar y el header nunca desaparecen al cambiar de sección.
- El fondo y el layout permanecen estables durante toda la sesión autenticada.

---

### Avance 16 — Restauración del loader canónico y validación final

Se restauró `lib/supabase/queries.ts` después de una contaminación accidental con código ajeno al proyecto.

Archivo intervenido:
- `lib/supabase/queries.ts`

Trabajo realizado:
- se eliminó el uso incorrecto de `@/utils/supabase/client`
- se restituyó el import correcto `@/lib/supabase/client`
- se restauraron `fetchPortalSnapshot`, `upsertActa`, `replaceActaInvitados`, `uploadActaPdf`, `updateActaLink` y `deleteActa`
- se mantuvo compatibilidad con `modo_registro`, `observacion_documental`, `rut` en asistentes y `actasByMode`

Validación ejecutada:
- `npm run build`

Resultado:
- compilación Next.js exitosa con el loader restaurado y el flujo híbrido activo

---

## 8.2 Avances 2026-07-02 — Landing pública y páginas legales

### Avance 19 — Landing pública sobre Consejos Escolares

Se creó una landing pública en `/` para difundir qué es un Consejo Escolar y servir de puerta de entrada al portal. El login dejó de vivir en `/` y quedó consolidado en `/auth/login/`.

Archivos intervenidos:
- `components/landing/landing-page.tsx` → **nuevo** — landing completa (header sticky, hero, qué es, integrantes, funciones, normativa, recursos, videos, banda del portal, footer)
- `app/page.tsx` → ahora monta `LandingPage` en lugar de `AuthScreen`
- `components/portal/app-frame.tsx` → concepto `isPublicRoute`; rutas protegidas sin sesión redirigen a `/auth/login/`
- `app/globals.css` → scroll suave scoped a la landing

Detalle operativo:
- el botón "Acceder al Portal" (ícono `LogIn`) del menú y del footer enlaza `/auth/login/`
- el callback OAuth no cambió: sigue llegando a `/auth/login/`
- los links del menú usan anchors absolutos (`/#que-es`) para funcionar desde las páginas legales
- contenido normativo enlazado a Ley Chile (BCN): Ley 19.979, Decreto 24/2005, Ley 20.845, LGE 20.370, Ley 21.040

Hallazgo importante (no repetir):
- `app/colors_and_type.css` pinta `h1`–`h5`, `p` y `a` con selectores de elemento que le ganan al color heredado; sobre fondos oscuros todo texto debe llevar clase de color explícita (`text-white`, `text-inherit`)
- el export estático se ve sin estilos si se abre `out\index.html` vía `file://`; siempre servir por HTTP (`npm run dev` o `npm run preview`)

### Avance 20 — Páginas legales según normativa chilena

Se crearon `/terminos/`, `/privacidad/` y `/cookies/` como rutas públicas estáticas, redactadas según Leyes 19.628, 21.719 (vigencia plena dic. 2026), 21.663 (Marco de Ciberseguridad), 21.459 (delitos informáticos), 21.096, 21.180, 20.285 y 17.336.

Archivos intervenidos:
- `components/landing/legal-page.tsx` → **nuevo** — layout artículo compartido
- `app/terminos/page.tsx`, `app/privacidad/page.tsx`, `app/cookies/page.tsx` → **nuevos**
- `app/globals.css` → estilos `.legal-article`
- `components/landing/landing-page.tsx` → enlaces legales en el footer

Detalle operativo:
- la política de cookies documenta el almacenamiento real (`consejos-portal`, `consejos.portal.selected-rbd`, `consejos.portal.auth-state.v1`, snapshots) — si cambian las claves, actualizar `/cookies/`
- no hay cookies propias ni analítica → no se requiere banner de consentimiento; si se agrega analítica, pedir consentimiento (Ley 21.719)
- correo de contacto provisional `contacto@slepcolchagua.cl` en las tres páginas — **confirmar canal oficial**

Documentación del módulo: `components/landing/context-landing.md`

Validación ejecutada:
- `npx tsc --noEmit`, `npx eslint` y `npm run build` sin errores; rutas verificadas sobre HTTP con `serve out`

---

## 9. Riesgos y Observaciones Actuales

- La migración `bootstrap_current_user_profile_from_base_escuelas()` se redefine varias veces en el historial; la definición efectiva es la última aplicada.
- Si la migración `20260514_consejos_usuario_establecimiento_roles.sql` no se ejecuta en la base real, el frontend seguirá mostrando el comportamiento anterior.
- La seguridad real ya no depende del texto en `usuarios_perfiles.rol`; depende de `usuario_establecimiento_roles`, `is_global_admin()` y `current_accessible_rbds()`.
- `usuarios_perfiles` ahora permite lectura por alcance: admin global y colaborador global ven todo; representantes pueden leer perfiles de escuelas dentro de su cobertura RBD.
- La escritura ya no debe inferirse desde `has_school_scope_access()`; las mutaciones reales dependen de `has_school_write_access()`.
- El admin sembrado en la migración debe usar el correo real de login; si se deja una variante incorrecta del dominio, el bootstrap no lo tratará como global.
- El shell principal ya no depende de un ancho máximo fijo; futuras vistas deben respetar esa expansión y evitar wrappers internos demasiado angostos.
- La escuela activa en contexto ya es una dependencia funcional del flujo de actas; cualquier cambio en `selectedRbd` debe validarse también abriendo `Nueva acta`.
- La restauración de `selectedRbd` y caché de auth no debe volver a ejecutarse durante el render inicial; hacerlo reintroduce hydration mismatch en producción.
- Si una mejora toca experiencia y permisos al mismo tiempo, actualizar siempre este `context.md` además del archivo funcional y la migración SQL correspondiente.
- Si la migración `20260424_consejos_actas_registro_documental.sql` no está aplicada, el frontend híbrido quedará desalineado con la base y fallarán `modo_registro`, `observacion_documental` o los horarios nullable.
- `lib/supabase/queries.ts` es el punto canónico del snapshot y de las mutaciones de actas; no debe reemplazarse con implementaciones externas ni imports a `@/utils/...`.
- El flujo documental depende de que `link_acta` exista al guardar; cualquier relajación futura debe coordinarse simultáneamente entre UI, migración y RPC SQL.
- Las métricas del portal ahora distinguen entre completitud y registro documental; cualquier KPI nuevo debe decidir explícitamente si cuenta ambos modos o solo `ACTA_COMPLETA`.
- **No agregar `app/loading.tsx`** a nivel del directorio `app/`. Su presencia rompe la continuidad visual entre navegaciones. Si se necesita skeleton, hacerlo dentro del `page.tsx` correspondiente.
- `PortalSnapshotProvider` debe permanecer como envoltura exterior de todas las ramas autenticadas en `AppFrame`. No moverlo dentro de ramas condicionales.
- La clase `panel-reveal` sigue disponible en CSS para usos puntuales (primera carga, animaciones de modales), pero no debe aplicarse a componentes que se remontan en cada navegación.

### 9.x Hallazgo 2026-06-08 — proyecto Supabase compartido con `portal-participacion`

Auditoría de acceso (originada por errores RLS al subir evidencias de actas) reveló que el proyecto Supabase `csxgnabxblkqkgpxcpyw` **no es exclusivo de Consejos**: también lo usa `portal-participacion` (47 migraciones propias: `tareas`, `gmail_metrics_cache`, `auth_users_roles`, etc.). Ambos portales autentican contra el mismo `auth.users` (`@slepcolchagua.cl`).

- **Riesgo crítico ~~activo~~ CERRADO el 2026-07-02** (migración `20260702_consejos_close_anon_actas_and_base_escuelas_write.sql`, ya aplicada en producción): UPDATE e INSERT de la planilla quedaron restringidos a `is_base_escuelas_editor()`; la lectura `anon` de `actas` también fue eliminada ese día. Descripción original del riesgo: la tabla `public."BASE DE DATOS ESCUELAS SLEP"` (planilla maestra de la que Consejos sincroniza `establecimientos`/`usuario_establecimiento_roles`) tiene una política RLS de `UPDATE` creada por `portal-participacion` (`20260406_consejos_storage_evidencias...` → en realidad `20260406_base_escuelas_rls_update.sql` de ese repo) con `USING (true) WITH CHECK (true)` — **sin filtro de rol**. Cualquier usuario autenticado de cualquiera de los dos portales puede editar `CORREO REPRESENTANTE`, `REPRESENTANTE CONSEJO ESCOLAR`, `DIRECTOR/A`, RBD, etc., y esos cambios se propagan a `usuario_establecimiento_roles` de Consejos, otorgando/revocando acceso a escuelas de forma silenciosa. (En portal-participacion, la edición de esos campos sí es una función legítima de `DirectorioPage.tsx`, gateada solo en el cliente para roles `admin/coordinador/fi/be` — la RLS abierta es lo que sobra.)
- **Bug de login de directores (relacionado, no idéntico):** documentado en `20260528_consejos_fix_director_accessible_rbds.sql` — diferencias de normalización de correo entre la planilla y el JWT (alias de dominio, espacios, codificación) dejan a directores sin fila en `usuario_establecimiento_roles` → `current_accessible_rbds()` vacío → pantalla de error sin shell. Hay un fallback parcial vía `usuarios_perfiles.rbd`, pero ese campo también se llena vía emparejamiento contra la misma planilla.
- **Decisión tomada:** no migrar a un proyecto Supabase nuevo (el costo real estaría en migrar `auth.users`, no en el esquema). En su lugar, **completar la independencia de datos que ya existe en gran parte**: el runtime de login (`get_current_portal_scope()`) ya solo lee de `establecimientos` / `usuario_establecimiento_roles` / `usuarios_perfiles` — tablas propias de Consejos. El acoplamiento real que queda son las funciones `sync_establecimientos_from_base_escuelas()`, `sync_usuario_establecimiento_roles_from_base_escuelas()` y `bootstrap_current_user_profile_from_base_escuelas()`.
- **Plan de corte (pendiente de ejecutar):** (1) importar una última vez desde la planilla a las tablas propias, auditando y corrigiendo en ese momento los correos de cada director/representante (usando el correo real de login, no el de la planilla); (2) dejar de invocar las funciones `sync_*_from_base_escuelas`; (3) gestionar altas/bajas en adelante solo vía el panel de admin (`upsert_usuario_establecimiento_rol`, ya implementado y con auditoría vía `portal_access_audit_trigger`); (4) opcionalmente revocar el acceso de Consejos sobre `BASE DE DATOS ESCUELAS SLEP` y retirar las funciones de sync.
- Mientras no se ejecute ese corte, **cualquier "problema serio de acceso"** reportado debe revisarse primero contra `usuario_establecimiento_roles` (¿existe la fila?, ¿el correo está bien normalizado respecto al de login real?) antes de asumir que es un bug nuevo de RLS.

### 9.y Auditoría en vivo 2026-07-02 — estado real de producción y cierres aplicados

Auditoría directa contra el proyecto Supabase (`csxgnabxblkqkgpxcpyw`) vía Management API (`POST /v1/projects/{ref}/database/query`, autenticada con el token del CLI que vive en el Administrador de Credenciales de Windows bajo `Supabase CLI:supabase`; `supabase db dump` no sirve sin Docker).

**Confirmado correcto en producción:**

- RLS activo en las 9 tablas del portal; funciones RLS (`has_school_scope_access`, `has_school_write_access`, `current_accessible_rbds`, `is_global_admin`, `has_school_scope_access_storage_key`) en su versión final (gate de dominio + separación lectura/escritura + fallback de director por perfil)
- Las 4 políticas de storage de `evidencias_actas` coinciden con la migración definitiva `20260619`
- Trigger de auditoría `portal_access_audit_trigger` activo sobre `usuario_establecimiento_roles`
- Lista blanca cargada: 69 filas `DIRECTOR` activas (una por establecimiento, 69 establecimientos), 4 representantes cubren las 69 escuelas, 0 correos malformados
- Supabase Auth: `disable_signup: false` + Google OAuth habilitado → el "registro" de directores ocurre automáticamente en el primer login (lógica *whitelist primero, registro automático después* validada de punta a punta); redirect `https://consejos.colchaguaparticipa.app/auth/login/` en la allow-list *(verificado 2026-07-08: la allow-list ya incluye también `https://consejos.slepcolchagua.gob.cl/auth/login/` y `/`; el `site_url` del proyecto sigue siendo `https://www.colchaguaparticipa.app` — fallback cuando un redirect no está listado)*
- Los 4 usuarios de Auth sin rol en Consejos no ven ningún dato (deny by default verificado)

**Hallazgos cerrados ese mismo día** (migración `20260702_consejos_close_anon_actas_and_base_escuelas_write.sql`, aplicada en producción):

1. `actas` tenía política SELECT `anon` con `USING (true)` (`anon_select_directorio`, patrón de portal-participacion): las 125 actas eran legibles sin sesión con la anon key. Eliminada; verificado por REST que anon ahora recibe 0 filas. La lectura queda solo con sesión autenticada (`actas_select_portal_authenticated` amplia + `Leer actas por rbd` acotada). Atenuante verificado: `asistentes` estaba vacío (`[]`) en las 125 actas, sin datos personales en tabla.
2. UPDATE e INSERT de `"BASE DE DATOS ESCUELAS SLEP"` abiertos a cualquier autenticado: restringidos a `is_base_escuelas_editor()` (roles `admin/coordinador/fi/be` de `auth_users_roles` — el gate que la UI de portal-participacion aplicaba solo en cliente — más admin global de Consejos).
3. Fila ADMIN con typo `camilo.serra@slepcolchagua.c` desactivada.

**Hallazgos abiertos** (ver "Pendiente o parcial" en §2): bucket `evidencias_actas` público, planilla maestra legible por `anon`, validación de correos reales de directores (caso `ximena.lopez`/`ximena.pino`), plan de corte del sync.

La misma política `anon_select_directorio` sigue existiendo sobre tablas de portal-participacion (`actas_inteligencia`, `matricula_mensual`, `ive_sinae_escolar`, `base_establecimiento_cargos`, `encargados_beneficios`); no se tocaron por ser de ese portal.

### 9.z Tubería de eventos de auditoría 2026-07-02 — de pantalla vacía a trazabilidad real

Hasta este cambio, la pantalla `/admin/auditoria/` leía la tabla `logs` pero **ningún código escribía en ella**: la bitácora operativa estaba estructuralmente vacía (solo `portal_access_audit` tenía datos reales vía su trigger). Se implementó la tubería completa (migración `20260702_consejos_portal_event_log.sql`, **aplicada y verificada en producción el 2026-07-02** vía Management API):

**Contrato SQL:**

- enum `log_action` ampliado de 4 a 11 valores: se suman `CREAR_CUENTA`, `SUBIR_EVIDENCIA`, `ELIMINAR_EVIDENCIA`, `PROGRAMAR_SESION`, `EDITAR_PROGRAMACION`, `CANCELAR_PROGRAMACION`, `EXPORTAR_ACTAS`
- RPC `log_portal_event(p_accion, p_rbd, p_detalle, p_vista_origen)` — `SECURITY DEFINER`, grant solo a `authenticated`. El actor (`usuario`) se deriva **siempre** del email del JWT en el servidor: el cliente no puede suplantar a otro usuario. Whitelist de acciones en la función; `CREAR_CUENTA` está excluido (reservado al trigger). Dedupe de `LOGIN` en servidor: se ignora en silencio si el mismo usuario ya registró uno en los últimos 5 minutos
- trigger `trg_log_new_auth_user` (`AFTER INSERT` sobre `auth.users`) registra `CREAR_CUENTA` con el proveedor OAuth; su función silencia cualquier excepción para **nunca bloquear un signup**

**Instrumentación en frontend (fire-and-forget, nunca rompe el flujo principal):**

- helper `logPortalEvent()` en `lib/supabase/audit.ts`
- `LOGIN`: `lib/auth/context.tsx`, dedupe en cliente por `userId + last_sign_in_at` en localStorage (clave `consejos.portal.login-event.v1`) — no se duplica por recargas ni refresh de token
- `CREAR_ACTA`/`EDITAR_ACTA`: `components/portal/acta-form.tsx` (distingue por `isNewActa`)
- `ELIMINAR_ACTA` y `EXPORTAR_ACTAS` (CSV y Excel): `app/actas/page.tsx`
- `SUBIR_EVIDENCIA`/`ELIMINAR_EVIDENCIA` y `PROGRAMAR_SESION`/`EDITAR_PROGRAMACION`/`CANCELAR_PROGRAMACION`: dentro de las mutaciones de `lib/supabase/queries.ts` (`cancelProgramacion` ahora acepta `rbd` opcional para contexto)

**Límites aceptados:** no se registra navegación por vistas ni LOGOUT; si la RPC falla el evento se pierde en silencio; borrar localStorage >5 min después de ingresar puede producir un LOGIN duplicado cosmético. Detalle completo en `app/admin/context-auditoria.md`.

---

## 10. Modelo de Datos y Dominio

### Entidades principales

| Tabla | Descripción |
|---|---|
| `establecimientos` | Escuelas del SLEP (derivada de la base maestra) |
| `usuario_establecimiento_roles` | Fuente de verdad del acceso por `correo + rol + RBD` |
| `usuarios_perfiles` | Perfil extendido del usuario autenticado |
| `programacion` | Planificación de sesiones de Consejo |
| `actas` | Actas oficiales de sesiones |
| `actas_invitados` | Invitados externos por acta |
| `logs` | Bitácora de eventos del portal (login, cuentas, actas, evidencias, programación, export); se escribe vía RPC `log_portal_event()` y trigger sobre `auth.users` — ver §9.z |
| `BASE DE DATOS ESCUELAS SLEP` | Planilla maestra **compartida con `portal-participacion`** (mismo proyecto Supabase); fuente histórica de sincronización, en proceso de dejar de ser dependencia en runtime — ver §9.x |

### Tipos funcionales expuestos al frontend (`types/domain.ts`)

```ts
type UserRole      = "ADMIN" | "DIRECTOR" | string
type SessionType   = "Ordinaria" | "Extraordinaria"
type SessionFormat = "Presencial" | "Online" | "Híbrido"
type PlanningStatus = "PROGRAMADA" | "REALIZADA" | "CANCELADA"
type ActaRecordMode = "ACTA_COMPLETA" | "REGISTRO_DOCUMENTAL"
type PortalManagedAccessRole = "ADMIN" | "COLABORADOR" | "DIRECTOR" | "REPRESENTANTE"
```

### Reglas de negocio modeladas

- La identidad del establecimiento gira alrededor del `RBD`
- El acceso real se decide por `usuario_establecimiento_roles`, no por el texto de `usuarios_perfiles.rol`
- El rol `DIRECTOR` queda acotado a su propio RBD en toda escritura
- El representante puede navegar con perfil administrativo, pero su alcance efectivo sigue limitado a los `RBD` asignados
- El rol `ADMIN` puede ver y gestionar datos de cualquier establecimiento y gestionar usuarios del portal
- El rol `COLABORADOR` puede ver todo el portal, pero no crear, editar ni eliminar registros
- El N° de sesión se calcula del servidor (`count(actas por rbd+tipo) + 1`) — nunca editable en UI
- Los PDFs de evidencia viven en el bucket `actas` con path `{rbd}/{año}/{actaId}.pdf`
- `ACTA_COMPLETA` y `REGISTRO_DOCUMENTAL` comparten la misma tabla `actas` y el mismo correlativo operativo
- `REGISTRO_DOCUMENTAL` exige documento adjunto y puede omitir horario detallado y contenido estructurado
- `AttendeeSlot` ahora puede incluir `rut` para trazabilidad mínima de asistentes presentes

---

## 9. Integración con la Base Maestra de Escuelas

> **Actualización 2026-06-08:** esta integración está marcada para retiro — ver §9.x "Hallazgo 2026-06-08" más abajo. La tabla es compartida con `portal-participacion` (mismo proyecto Supabase), tiene RLS de escritura abierta a cualquier autenticado, y es la causa raíz tanto del riesgo de acceso cruzado entre portales como del bug de login de directores por desajuste de normalización de correo. El runtime de login (`get_current_portal_scope()`) **ya no depende de ella** — solo quedan las funciones de sincronización descritas abajo, que deben dejar de invocarse una vez completada la migración a gestión 100% manual vía `usuario_establecimiento_roles`.

La autenticación depende operativamente de `public."BASE DE DATOS ESCUELAS SLEP"` (dependencia heredada, en proceso de eliminarse).

### Funciones SQL de integración

| Función | Propósito |
|---|---|
| `normalize_portal_email(raw_email)` | Normaliza correo para matching |
| `base_escuelas_access_rows()` | Proyección normalizada de acceso desde la base maestra |
| `base_escuelas_normalized_rows()` | Lee filas normalizadas de la base maestra |
| `sync_establecimientos_from_base_escuelas()` | Sincroniza tabla `establecimientos` |
| `sync_usuario_establecimiento_roles_from_base_escuelas()` | Sincroniza `usuario_establecimiento_roles` desde la base maestra |
| `bootstrap_current_user_profile_from_base_escuelas()` | Crea/actualiza `usuarios_perfiles` |
| `get_slep_directorio()` | RPC para el selector de establecimientos en formularios |

### Dependencias de la base maestra

Columnas necesarias para matching:
- `RBD`
- `NOMBRE ESTABLECIMIENTO`
- `DIRECTOR/A`
- `CORREO ELECTRÓNICO`
- `REPRESENTANTE CONSEJO ESCOLAR`
- `CORREO REPRESENTANTE`

Si la base real difiere del esquema inferido, el bootstrap puede vincular mal usuarios.

---

## 10. Snapshot de Datos

`fetchPortalSnapshot(rbdFilter?)` realiza lecturas en paralelo de:
- `establecimientos`
- `programacion`
- `actas` + `actas_invitados` (combinados en el cliente)

Construye derivados:
- `attendanceByRole` — ratio de asistencia por rol
- `planningByComuna` — totales de programación por comuna
- `actasByMode` — separación entre `ACTA_COMPLETA` y `REGISTRO_DOCUMENTAL`

Normalizaciones vigentes en cliente:
- `fetchPortalSnapshot()` normaliza `modo_registro`
- los asistentes de `actas.asistentes` se normalizan incluyendo `rut`
- `hora_inicio` y `hora_termino` pueden venir como `null`

### Diagnósticos

El snapshot incluye diagnósticos por scope (`ok`, `empty`, `error`, `info`). `DataBanner` solo renderiza cuando hay status `"error"` — los demás estados son silenciosos.

---

## 11. Seguridad y RLS

### Funciones helper RLS

```sql
-- SIEMPRE con SECURITY DEFINER — ver lección crítica §18
CREATE OR REPLACE FUNCTION public.is_global_admin() RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    -- consulta usuario_establecimiento_roles por correo autenticado
$$;

CREATE OR REPLACE FUNCTION public.current_accessible_rbds() RETURNS TABLE (rbd text)
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    -- devuelve todos los RBD si el correo tiene rol ADMIN; en otro caso, solo sus RBD asignados
$$;

CREATE OR REPLACE FUNCTION public.has_school_scope_access(target_rbd text) RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    -- resuelve lectura/escritura por RBD a partir del alcance efectivo del correo autenticado
$$;
```

Nota operativa:

- `usuarios_perfiles.nombre_director` es un campo legacy de presentación/bootstrap; no decide permisos de portal ni acceso a Storage.
- El permiso efectivo actual sale de `usuario_establecimiento_roles`, `current_accessible_rbds()` y `has_school_scope_access()`.

### Alcance de las políticas RLS

| Tabla | Lectura | Escritura |
|---|---|---|
| `establecimientos` | Admin o RBD propio | Admin |
| `usuarios_perfiles` | Perfil propio, admin global o perfiles dentro de RBD accesible | Perfil propio (bootstrap via función) |
| `programacion` | Por RBD o admin | Por RBD o admin |
| `actas` | Por RBD o admin | Por RBD o admin |
| `actas_invitados` | Ligado al acta visible | Ligado al acta del RBD |
| `logs` | Por alcance correspondiente | Vía RPC `log_portal_event()` (SECURITY DEFINER, actor desde JWT) y trigger de `auth.users`; el insert directo sigue gobernado por la policy por RBD |

### Capas de protección en el módulo de actas

1. RLS en `actas` y `actas_invitados`
2. RPC `save_acta_complete` con validación de RBD explícita (SECURITY DEFINER)
3. Validación cliente en `handleSubmit` (`profile.rbd === form.rbd` para DIRECTOR)
4. Rate limit cliente 3 s entre guardados
5. Sanitización de todos los campos de texto antes de persistir
6. Render como texto plano en JSX (React escapa automáticamente)

### Storage

- Bucket: `evidencias_actas`
- Path: `{rbd}/{año}/{actaId}.pdf` — `buildActaDocumentPath()` reemplaza `/` por `-` en el RBD (`6301404/33883-4` → `6301404-33883-4`)
- **Las cuatro políticas de `evidencias_actas` (SELECT/INSERT/UPDATE/DELETE) deben usar `public.has_school_scope_access_storage_key(nullif(split_part(name, '/', 1), ''))`** — esta función maneja la normalización de RBD con `/` y funciona correctamente en el contexto del storage service de Supabase
- Lectura resuelta con `getPublicUrl()` desde el bucket
- La migración definitiva es `20260619_consejos_storage_write_allow_representante_domain.sql`; consolida las cuatro políticas en `has_school_scope_access_storage_key`
- **Invariante crítica de storage (lección 2026-06-19)**: nunca crear una función helper separada para escritura en `storage.objects` con condiciones adicionales sobre la de lectura. El storage service de Supabase tiene un contexto de ejecución diferente a PostgREST — funciones que pasan en el SQL Editor pueden fallar sistemáticamente en uploads aunque todos los datos sean correctos (rol activo, email coincidente, RBD normalizado). La única función probada como confiable en ese contexto es `has_school_scope_access_storage_key`. Si se sospecha un bug de RLS en storage y el diagnóstico de datos es correcto, revisar la función de la política, no los datos
- Si `20260526_consejos_storage_scope_normalized_rbd.sql` no está aplicada, `has_school_scope_access_storage_key` no existe y las políticas de `20260619` no se pueden crear
- Si `20260619_consejos_storage_write_allow_representante_domain.sql` no está aplicada, escuelas con RBD tipo anexo (`/`) reciben `new row violates row-level security policy` en cualquier upload y `400` en GET de archivo

---

## 12. Diseño Visual y Branding

**Fuente de verdad del sistema visual:** `node_modules/@slep-colchagua/design-system/INSTRUCCIONES_DISENO.md`
Tokens CSS en: `app/colors_and_type.css` (espejo de `node_modules/@slep-colchagua/design-system/tokens/colors_and_type.css`)

### Tipografía

Fuente local (no Google Fonts):
- `MuseoSans-100.woff`, `MuseoSans-500.woff`, `MuseoSans-700.woff`, `MuseoSans-900.woff`
- Variable CSS: `--font-museo-sans`
- Fallback obligatorio: Avenir Next → Segoe UI → Helvetica Neue → Arial
- **Nunca usar**: Inter, Roboto, Open Sans

### Paleta Tailwind

#### Escalas completas (brand primaries)

| Escala | DEFAULT | Uso principal |
|---|---|---|
| `navy` | `#25306B` | Texto, navy-700 para hovers, navy-900 para fondos oscuros |
| `royal` | `#006BB9` | Primario interactivo (botones, links, foco) |
| `coral` | `#FF1D3D` | Destructivo, errores, acciones de peligro |
| `neutral` | — | Fondos, bordes, texto secundario (escala 0–900) |

#### Aliases semánticos Tailwind

| Token | Valor | Uso |
|---|---|---|
| `ink` | `#25306B` (navy-500) | Texto principal |
| `mist` | `#EDF0F5` (neutral-100) | Fondos de sección |
| `ocean` | `#006BB9` (royal-500) | Primario (acciones, links, foco) |
| `ember` | `#FF1D3D` (coral-500) | Errores, destructivo |

> No existe `sand` ni `pine` — esos aliases fueron eliminados.

#### Tokens de estado (status)

| Token | Color | Uso |
|---|---|---|
| `status-info` | `#006BB9` | Info — texto o icono |
| `status-info-bg` | `#E5F2FB` | Info — fondo de bloque |
| `status-success` | `#1F8A5B` | Éxito — texto o icono |
| `status-success-bg` | `#E3F5EB` | Éxito — fondo de bloque |
| `status-warning` | `#C77A00` | Advertencia — texto o icono |
| `status-warning-bg` | `#FFF1D6` | Advertencia — fondo de bloque |
| `status-danger` | `#E5142F` | Peligro/error — texto o icono |
| `status-danger-bg` | `#FFE5E9` | Peligro/error — fondo de bloque |

> **Regla**: Nunca usar `amber-*`, `sky-*`, `rose-*`, `emerald-*`, `green-*`, `blue-*` o `slate-*`. Siempre usar tokens de estado o escalas `navy`/`royal`/`coral`/`neutral`.

### Radios de borde

| Clase Tailwind | Valor | Contexto de uso |
|---|---|---|
| `rounded-control` | `8px` | Inputs, selects, botones, chips interactivos |
| `rounded-card` | `12px` | Cards, paneles de contenido, filas destacadas |
| `rounded-modal` | `20px` | Modales, sheets, superficies grandes |
| `rounded-pill` | `999px` | Badges, chips visuales, avatares |

> **Regla crítica**: Nunca usar `rounded-2xl`, `rounded-[24px]`, `rounded-[28px]`, etc. Siempre usar las clases semánticas. Nunca `border-radius > 16px` en cards.

### Sistema de sombras (navy-tinted)

Todas las sombras usan `rgba(37,48,107,x)` — nunca `rgba(0,0,0,x)` ni valores slate/gray.

| Clase | Valor | Uso |
|---|---|---|
| `shadow-xs` | `0 1px 2px rgba(37,48,107,0.06)` | Sutil, casi sin elevación |
| `shadow-sm` | `0 2px 6px rgba(37,48,107,0.08)` | Cards mínimas |
| `shadow-md` | `0 6px 18px rgba(37,48,107,0.10)` | Cards estándar, dropdowns |
| `shadow-lg` | `0 16px 40px rgba(37,48,107,0.14)` | Panels, sidebars |
| `shadow-xl` | `0 28px 64px rgba(37,48,107,0.18)` | Modales |
| `shadow-focus` | `0 0 0 3px rgba(0,107,185,0.35)` | Ring de foco accesible |

### Proporciones y gradientes

- Color proportion rule: ~60% white/soft, ~25% navy, ~10% royal, ~5% coral
- Gradientes **solo** en heroes, covers y banners — nunca en cards ni panels
- Gradientes disponibles: `bg-grad-navy`, `bg-grad-deep-blue`, `bg-grad-hero`, `bg-grad-red-fade`

### Fondo y ambiente

`globals.css` define:
- `bg-hero-grid`: hero con grid fino + gradiente para la sección de resumen
- Selección de texto azul (`::selection`)
- `@media print`: oculta nav/sidebar, fondo blanco, A4
- `skeleton-shimmer`: animación de esqueleto para estados de carga

### Componentes UI propios

| Componente | Variantes |
|---|---|
| `Button` | `primary`, `secondary`, `ghost` — `rounded-control` (nunca `rounded-full`) |
| `Badge` | `neutral`, `success`, `warn` — `rounded-pill` (chips visuales) |
| `Toaster` / `toast()` | `success`, `error`, `info` |
| `ConfirmDialog` | `tone: "default" \| "danger"` |

---

## 13. Módulo de Actas — Estado Completo (2026-04-18)

El módulo de actas (`/actas/`) es el más completo del portal. Ver [`app/actas/context-actas.md`](app/actas/context-actas.md) para documentación detallada.

### Capacidades actuales

- Crear, editar, ver (solo lectura) y eliminar actas
- Búsqueda full-text + filtro por tipo de sesión
- Registro de asistencia para 6 estamentos fijos
- Validación de RUT chileno (módulo-11) para Apoderado
- Quórum en tiempo real (4/6 mínimo)
- Grilla dinámica de invitados externos
- Upload de PDF con drag & drop y barra de progreso
- Modo borrador (`Guardar avance`) y modo final (`Guardar acta final`)
- Persistencia de borrador en `localStorage` (solo actas nuevas)
- Guardia de cambios sin guardar al cerrar el formulario
- Toast de confirmación post-guardado
- Vista de solo lectura con impresión A4 integrada
- Rate limit cliente de 3 s entre guardados
- Validación de RBD del DIRECTOR antes de persistir
- Sanitización de texto (`.trim()`) antes de enviar a BD

### Componentes nuevos añadidos en el sprint 2026-04-18

| Componente | Ubicación |
|---|---|
| `ActaDetail` | `components/portal/acta-detail.tsx` |
| `ConfirmDialog` | `components/portal/confirm-dialog.tsx` |
| `Toaster` / `toast()` | `components/ui/toast.tsx` |
| RPC `save_acta_complete` | `supabase/migrations/20260418_save_acta_atomic.sql` |

---

## 14. Hallazgos Importantes

### 14.1 El redirect de Supabase Auth no es solo código

El frontend ya envía `emailRedirectTo` hacia `/auth/login/` y procesa el callback explícitamente. Si el correo sigue yendo al portal anterior, la causa está en la configuración de Supabase Auth (Site URL, Redirect URLs, plantilla de correo con dominio hardcodeado).

### 14.2 El acceso puede llegar como link o como OTP

El flujo UI ya maneja ambos formatos: magic link (procesado en `/auth/login/`) o código numérico (ingresado manualmente). Esto depende de la configuración del proyecto Supabase.

### 14.3 `next/image` no sirve bien en export estático

`images.unoptimized: true` en `next.config.js` evita dependencia de `/_next/image`. No revertir esto.

### 14.4 RLS puede hacer parecer que no hay datos

Queries vacíos pueden indicar sesión expirada, política bloqueando filas, o ausencia real de registros. Los diagnósticos del snapshot ayudan a distinguir estos casos.

### 14.5 La base maestra es parte crítica del login

Sin correspondencia entre correos institucionales y registros en `BASE DE DATOS ESCUELAS SLEP`, el usuario puede autenticarse pero no resolver perfil ni establecimiento.

### 14.6 README desactualizado

`README.md` mezcla estado antiguo del scaffold público con el portal autenticado actual. Este `context.md` es la fuente más precisa hasta que se alinee el README.

### 14.8 Imports estáticos de librerías browser-only corrompen los payloads RSC en export estático (incidente 2026-05-14)

#### Qué pasó

Después de integrar generación de PDF (`html2canvas` + `jspdf`), navegar entre páginas dejó de funcionar. Las URLs en producción terminaban en `.../index.txt` y el navegador mostraba el contenido crudo del payload RSC en lugar de la página correcta.

#### Causa raíz

Con `output: "export"` + `trailingSlash: true`, Next.js genera dos archivos por ruta:
- `[ruta]/index.html` — HTML estático para la primera carga
- `[ruta]/index.txt` — payload RSC para la navegación client-side

Al hacer `import html2canvas from "html2canvas"` e `import jsPDF from "jspdf"` **al nivel del módulo** en un componente `"use client"`, Next.js ejecuta ese código durante el build. Estas librerías son exclusivamente browser (usan `window`, `document`, Canvas API), por lo que su ejecución en el contexto SSG corrompe los archivos `.txt`. Cuando el router de Next.js intenta cargar el payload RSC para navegar, recibe contenido inválido y el navegador cae directamente sobre la URL del `.txt`.

El síntoma confirmatorio es que el hash del chunk de layout cambia entre un build limpio y un build con estos imports estáticos.

#### Causa secundaria

Durante el mismo sprint se cambió `router.replace(landingRoute)` por `window.location.replace(landingRoute)` en `app-frame.tsx`. Ese cambio forzaba una **navegación dura** (recarga completa) después del login, lo que también impedía que el router client-side de Next.js se inicializara correctamente.

#### Fix aplicado

1. Revertido `window.location.replace` → `router.replace` en `app-frame.tsx`
2. Eliminados `html2canvas` y `jspdf` de `package.json` + `npm install`
3. Eliminado `components/portal/acta-report-document.tsx`
4. Restaurado `acta-detail.tsx` al comportamiento de `window.print()` original
5. Rebuild con `npm run build` → chunk hash limpio confirmado

#### La regla

**Nunca importar librerías browser-only al nivel de módulo en componentes Next.js.**
Si se necesitan (`html2canvas`, `jspdf`, `canvas`, `dom-to-image`, `pdfmake`, etc.), usar `import()` dinámico dentro de la función que las requiere:

```ts
// MAL — rompe el build de export estático
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

// BIEN — solo se cargan cuando el usuario ejecuta la acción
async function handleExportPdf() {
  const html2canvas = (await import("html2canvas")).default;
  const jsPDF = (await import("jspdf")).default;
  // ...
}
```

---

### 14.7 El objeto `session` de Supabase se reemplaza en cada renovación de JWT

El `useEffect` de carga de acceso en `lib/auth/context.tsx` depende de `userId` (estable) en lugar de `session` (se reemplaza aunque el usuario no cambie). Cambiar esta dependencia causa el flash "Resolviendo sesión…" en cada navegación.

---

## 15. Lección Crítica: Recursión Infinita en RLS (incidente 2026-04-16)

### Qué pasó

El proyecto colapsó durante varias horas por RLS con recursión infinita. Agotó recursos, dejó el SQL Editor inaccesible, impidió pausar el proyecto y requirió soporte de Supabase.

### La causa exacta

```
Request autenticado
  → PostgREST consulta usuarios_perfiles
    → RLS evalúa política SELECT: llama a is_admin()
      → is_admin() hace SELECT sobre usuarios_perfiles
        → RLS evalúa política SELECT otra vez: llama a is_admin()
          → ... ∞ → ERROR 54001: stack depth limit exceeded
```

`is_admin()` consultaba `usuarios_perfiles` **sin** `SECURITY DEFINER`, lo que hacía que ese SELECT interno también pasara por RLS.

### La regla

**Toda función helper usada dentro de políticas RLS DEBE tener `SECURITY DEFINER`.**

```sql
-- CORRECTO
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE
SECURITY DEFINER          -- ← obligatorio
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.usuarios_perfiles WHERE id = auth.uid() AND rol = 'ADMIN'
  );
$$;
```

### Señales de alerta

- Error `54001: stack depth limit exceeded` en queries autenticadas
- Todas las queries autenticadas fallan, las anon funcionan
- CPU al 100% con requests normales
- SQL Editor con timeout o HTTP 544

### Checklist antes de crear política RLS nueva

1. ¿La política llama a una función helper?
2. ¿Esa función hace SELECT sobre tabla con RLS?
3. Si ambas son sí → la función **debe** tener `SECURITY DEFINER`.

**Fix aplicado:** `supabase/migrations/20260416_consejos_fix_rls_recursion.sql`

---

## 16. Restricciones Operativas Fijas

- No usar `SUPABASE_SERVICE_ROLE_KEY` en este frontend estático
- No usar API routes ni server actions para data crítica del portal
- No usar `next/image` con optimización en export estático
- No duplicar fetch de datos en páginas — todo va por `usePortalSnapshot()`
- No crear funciones helper de RLS sin `SECURITY DEFINER`
- No hacer el N° de sesión editable en UI
- No mostrar mensajes de "Datos sincronizados" en `DataBanner` — solo errores reales
- No usar `session` completo como dependencia de `useEffect` en auth — usar `userId`
- **No importar librerías browser-only al nivel de módulo** (`html2canvas`, `jspdf`, `canvas`, `dom-to-image`, etc.) — en export estático corrompen los payloads RSC y rompen la navegación client-side. Usar siempre `import()` dinámico dentro de la función que los necesita.
- **No usar `window.location.replace()`** para redirecciones internas — usar siempre `router.replace()` del hook `useRouter` de Next.js. La navegación dura impide que el router client-side se inicialice y rompe las transiciones entre páginas.

---

## 17. Riesgos y Restricciones Actuales

### Riesgos técnicos

- `site_url` de Supabase Auth sigue apuntando a `https://www.colchaguaparticipa.app` (la allow-list ya incluye el dominio nuevo; el `site_url` solo actúa como fallback de redirects no listados)
- Desalineación entre datos reales y columnas inferidas de la base maestra
- Dependencia total del navegador para auth y fetch (export estático)
- Builds viejos o compilados con variables erróneas en producción — **riesgo materializado el 2026-07-08** (typo `supabase.com` horneado en el bundle del servidor; ver Avance 21)
- El `.env.local` del servidor gob.cl se rellena a mano (flujo `arrancar.sh` copia `.env.docker` → `.env.local`) — sin validación automática del valor de `NEXT_PUBLIC_SUPABASE_URL`
- Bucket `actas` sin política → cualquier usuario autenticado puede escribir en cualquier path

### Restricciones operativas

- Cambios de redirect del correo requieren revisión de Supabase Auth además del código
- El portal no puede depender de server-side rendering para ningún flujo de datos
- Cualquier nueva función helper usada en RLS debe tener `SECURITY DEFINER`

---

## 18. Checklist Operativo para Continuar

1. ~~Confirmar `NEXT_PUBLIC_SITE_URL` con el dominio real del portal.~~ **Hecho 2026-07-08:** `https://consejos.slepcolchagua.gob.cl` en `.env` y `.env.local` locales; falta corregir el `.env.local` del servidor (typo `supabase.com`, ver Avance 21).
2. ~~Verificar en Supabase Auth: `Site URL` y `Redirect URLs`.~~ **Verificado 2026-07-08:** allow-list incluye el dominio nuevo; `site_url` sigue en `www.colchaguaparticipa.app` (fallback, coordinar con portal-participacion).
3. Confirmar que usuarios institucionales existan en Supabase Auth.
4. Confirmar que `BASE DE DATOS ESCUELAS SLEP` tenga RBD y correos útiles.
5. Crear política del bucket `actas` (escritura autenticada por RBD, lectura pública).
6. Ejecutar `supabase db push` para aplicar `20260418_save_acta_atomic.sql`.
7. Migrar `handleSubmit` en `acta-form.tsx` a usar `.rpc('save_acta_complete', {...})`.
8. Agregar columna `correo` a `actas_invitados` y persistirla desde el formulario.
9. Implementar eliminación de PDF en storage cuando se borra un acta.
10. Alinear `README.md` con el estado real del portal.

---

### Avance 19 — Migración al design system @slep-colchagua/design-system (2026-05-14)

Se realizó una migración completa del sistema visual del portal al paquete `@slep-colchagua/design-system`.

El problema de partida era que el proyecto tenía tokens CSS y configuración Tailwind correctos, pero los archivos seguían usando clases de color no-DS (`slate-*`, `amber-*`, `sky-*`, `rose-*`, `emerald-*`) y radios de borde hardcodeados (`rounded-[24px]`, `rounded-2xl`, etc.).

Archivos intervenidos:

- `tailwind.config.ts` — se agregaron 8 status tokens (`status-info`, `status-success`, `status-warning`, `status-danger` + sus variantes `-bg`) y `rounded-modal: "20px"`
- `components/portal/shell.tsx` — `slate-*` → `neutral-*`, radios → `rounded-card`/`rounded-modal`, estado activo de navegación limpio sin sombras grises
- `components/auth/auth-screen.tsx` — `slate-950` → `navy-900`, radios semánticos, tokens de estado en bloques de feedback
- `components/portal/section-card.tsx` — `rounded-[28px]` → `rounded-modal`, sombra gris → `shadow-md`
- `components/ui/button.tsx` — `rounded-full` → `rounded-control` (botones son controles, no pills), sombras navy-tinted
- `components/ui/badge.tsx` — reescritura con tones `neutral`/`success`/`warn`, `rounded-pill`
- `components/portal/stat-card.tsx` — radios y colores actualizados
- `components/portal/data-banner.tsx` — reescritura completa con tokens de estado semánticos
- `components/portal/confirm-dialog.tsx` — radios semánticos, danger con `status-danger`
- `components/portal/session-table.tsx` — `slate-*` → `neutral-*`, radios semánticos
- `components/portal/acta-form.tsx` — 12 replace_all + ediciones específicas para amber→warning, QuorumBadge con status tokens
- `app/resumen/page.tsx` — CTAs con `rounded-control`, hero con radios correctos
- `app/actas/page.tsx` — `slate-*` → `neutral-*`, status tokens para estados de sesión
- `app/admin/page.tsx` — `slate-*` → `neutral-*`, error/success/rural con tokens semánticos
- `app/metricas/page.tsx` — `slate-*` → `neutral-*`, status tokens
- `app/programacion/page.tsx` — `slate-*` → `neutral-*`, drag-over con `status-warning`, status tokens en todas las variantes de estado

Reglas aplicadas sistemáticamente:
- Nunca `slate-*`, `amber-*`, `sky-*`, `rose-*`, `emerald-*` — siempre `neutral-*` o tokens de estado
- Nunca `rounded-2xl` o `rounded-[Npx]` — siempre `rounded-control`/`rounded-card`/`rounded-modal`/`rounded-pill`
- Nunca sombras con `rgba(0,0,0,x)` o `rgba(148,163,184,x)` — siempre navy-tinted vía `shadow-md`/`shadow-lg` etc.
- Botones CTA: `rounded-control` (8px), badges y chips: `rounded-pill` (999px)
- Colores de estado siempre con par texto + fondo: `text-status-warning bg-status-warning-bg`

---

## 19. Convenciones para Futuras Ediciones

- Mantener compatibilidad con export estático en todo momento.
- Todo nuevo módulo de datos: consumir `usePortalSnapshot()` — nunca fetch propio.
- Toda nueva función helper de RLS: `SECURITY DEFINER` + `SET search_path = public`.
- Toda acción destructiva desde UI: usar `ConfirmDialog` con `tone="danger"`.
- Todo feedback post-mutación: usar `toast()`.
- Toda UI que podría tener cambios no guardados: implementar dirty guard con `initialFormRef`.
- Mantener la pantalla de acceso (`/auth/login/`) como pantalla pura, sin contenido informativo; el contenido informativo público vive en la landing (`/`).
- Toda nueva página pública debe declararse en `isPublicRoute` de `components/portal/app-frame.tsx`.
- Sobre fondos oscuros, todo `h*`, `p` y `a` debe llevar clase de color explícita (ver `components/landing/context-landing.md`).
- `DataBanner` solo para errores reales — no silenciar errores reales, no mostrar éxito ni vacío.
- Los borradores de formulario van a `localStorage` — solo para formularios de creación, no edición.

#### Reglas del sistema visual (@slep-colchagua/design-system)

- **Nunca usar hex hardcodeados** — siempre clases Tailwind semánticas o variables CSS del DS.
- **Nunca usar** `slate-*`, `amber-*`, `sky-*`, `rose-*`, `emerald-*`, `green-*`, `blue-*` — usar `neutral-*`, `navy-*`, `royal-*`, `coral-*` o tokens `status-*`.
- **Nunca usar** `rounded-2xl`, `rounded-xl`, `rounded-[Npx]` — usar `rounded-control` (8px), `rounded-card` (12px), `rounded-modal` (20px), `rounded-pill` (999px).
- **Nunca usar sombras grises** (`rgba(0,0,0,x)`, `rgba(148,163,184,x)`) — usar siempre las sombras navy-tinted definidas en `tailwind.config.ts` (`shadow-sm`, `shadow-md`, `shadow-lg`, `shadow-xl`).
- **Botones y controles**: `rounded-control`. **Badges y chips**: `rounded-pill`. Nunca `rounded-full` para botones.
- **Colores de estado**: siempre en par texto + fondo — ej. `text-status-warning bg-status-warning-bg`.
- **Gradientes** solo en heroes, covers y banners — nunca en cards ni panels.
- **No bounce, spring, marquee ni parallax**. Las microanimaciones deben ser discretas (duración ≤ 300ms, ease natural).
- Antes de agregar cualquier clase de color nueva, verificar contra `INSTRUCCIONES_DISENO.md` y `tailwind.config.ts`.

---

### Avance 21 — Cambio de dominio a consejos.slepcolchagua.gob.cl, incidente de login Google y sincronización con SLEP-Territorial (2026-07-08)

#### Nuevo dominio y servidor de producción

El portal migró de `consejos.colchaguaparticipa.app` a **`https://consejos.slepcolchagua.gob.cl`**, servido por **nginx/1.18.0** en infraestructura institucional del SLEP (administra Alex Salinas, `alex.salinas@slepcolchagua.cl`). El dominio antiguo sigue sirviendo el portal en paralelo. Implicancia directa: las cabeceras versionadas en `public/.htaccess` son de Apache y **nginx las ignora** — la configuración real vive en `nginx-prod.conf` (ver sección de seguridad).

#### Incidente: login con Google roto tras el deploy del 2026-07-07

- **Síntoma:** al pulsar "Ingresar con Google" el navegador mostraba `DNS_PROBE_FINISHED_NXDOMAIN` para `csxgnabxblkqkgpxcpyw.supabase.com`. Cero logins desde el deploy (el último exitoso fue 8 minutos después, probablemente por el dominio antiguo).
- **Causa raíz:** el build desplegado se compiló con `NEXT_PUBLIC_SUPABASE_URL=https://csxgnabxblkqkgpxcpyw.supabase.com` — typo `.com` en vez de `.co` — en el `.env.local` del servidor (rellenado a mano desde la plantilla `.env.docker`). Como las variables `NEXT_PUBLIC_*` se hornean en los chunks al compilar, el typo quedó dentro de `out/_next/static/chunks/181-*.js` y ningún cambio de `.env` local podía arreglarlo sin recompilar.
- **Método de diagnóstico (reutilizable):** (1) config de Auth y logs vía Management API — allowlist y proveedor Google estaban correctos; (2) `edge_logs` mostró tráfico REST pero cero peticiones `/auth/v1/` → el fallo era client-side, previo a Supabase; (3) reproducción real con navegador headless (puppeteer-core + Edge instalado) capturando la navegación del clic → reveló la URL con typo; (4) `grep` del literal sobre los chunks desplegados lo confirmó.
- **Falsas pistas descartadas:** allowlist de redirects (ya incluía el dominio nuevo), cliente OAuth de Google (aceptaba el flujo), CSP (nginx solo enviaba `upgrade-insecure-requests`), código de `signInWithGoogle`/callback (correcto e idéntico al que funcionaba).
- **Resolución:** rebuild desde el repo con variables correctas; `out/` regenerado y verificado sin el typo. Pendiente del lado servidor: corregir el `.env.local` de la máquina gob.cl para que futuros builds ahí no reintroduzcan el error.

#### Sincronización de repositorios y flujo de trabajo con SLEP

- El remoto `origin` hace fetch de `kmilomore/consejos_portal` pero **empuja a dos repos a la vez**: `kmilomore/consejos_portal` y `SLEP-Territorial/Portalconsejos` (doble `pushurl`). Existe además el remoto `slep` (solo SLEP-Territorial). Un `git pull` corriente NO trae los cambios de SLEP-Territorial — para integrarlos: `git fetch slep && git merge slep/main`.
- Se integró el commit `c3077a1` de Alex Salinas (2026-07-06): infraestructura de deploy (`Dockerfile`, `docker-compose.yml`, `docker-compose.production.yml`, `nginx.conf`, `nginx-prod.conf`, `arrancar.sh`/`arrancar.bat`, `.dockerignore`, `.env.docker`) y **manejo centralizado de errores** (`lib/error-handling.ts` con `ClasificarError`/`withTimeout`/`logPortalError`, `lib/file-upload-errors.ts`), que reemplaza la normalización de mensajes de `lib/auth/context.tsx` y agrega reintentos con timeout al bootstrap de acceso. Merge limpio, build verificado.
- Desde el commit `711d6c6` la carpeta **`out/` está versionada** (se quitó de `.gitignore`): el build de producción viaja con el repo y el servidor puede servirla directamente tras un pull.

#### Pendientes que deja este avance

1. Corregir `NEXT_PUBLIC_SUPABASE_URL` en el `.env.local` del servidor gob.cl y redesplegar (o servir el `out/` versionado ya corregido).
2. Alinear la CSP de `nginx-prod.conf` (permite `unsafe-eval`, `cdn.jsdelivr.net`, Google Fonts, `img-src https:`) con la política estricta de `public/.htaccess` / `docs/seguridad.md`.
3. Evaluar actualizar el `site_url` de Supabase Auth (hoy `https://www.colchaguaparticipa.app`) en coordinación con portal-participacion, que comparte el proyecto.

### Avance 22 — Actualización de contenidos de la landing: normativa 2026, video institucional y texto justificado (2026-07-13)

Cambios de contenido y presentación en la landing pública (`components/landing/landing-page.tsx`) y páginas legales (`legal-page.tsx`), commit `21ad6d4`:

1. **Marco legal (`#normativa`):** se agregaron la **Ley N° 21.809** (convivencia, buen trato y bienestar de las comunidades educativas — prevención del acoso escolar, la discriminación y la violencia) y la **Ley N° 21.819** (modifica la Ley 21.040, fortaleciendo la gestión educativa del Sistema de Educación Pública), ambas enlazadas a Ley Chile (BCN). Se corrigió el enlace del Decreto 24/2005 al texto real (`idNorma=236237`; antes apuntaba a `idNorma=235379`).
2. **Funciones:** la card "Debe ser informado sobre" incorpora la cláusula abierta "Otras materias relacionadas con la gestión educativa del establecimiento" (6 ítems).
3. **Material audiovisual (`#videos`):** las 3 tarjetas que enlazaban búsquedas de YouTube fueron reemplazadas por **un único video institucional incrustado** (`<iframe>` a `youtube.com/embed/nJX3T2pVN1E`, constante `VIDEO_EMBED`). Se eliminó el array `VIDEOS` y el import de `PlayCircle`.
4. **Texto justificado:** todos los bloques de texto corrido del sitio público usan `text-justify` (hero, subtítulos de secciones, tarjetas, listas de funciones, modal de consentimiento y contenido legal). `SectionHead` ganó la prop `wideSubtitle` para subtítulos a ancho completo (usada en `#videos`).
5. **Footer:** la barra inferior agrega el crédito "Sitio desarrollado por la Subdirección de Gestión Territorial".

Detalle completo en `components/landing/context-landing.md`.
