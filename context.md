# Contexto del Proyecto: Consejos

> **Última actualización:** 2026-04-27  
> **Fuente de verdad:** este archivo. El README.md está desactualizado.
> **Contexto específico de programación:** ver `context_programacion.md` para el detalle operativo completo del módulo `programacion/`, sus invariantes, flujos y criterios para iterar con IA.

---

## 1. Resumen Ejecutivo

`Consejos/` es un portal de Consejos Escolares construido con Next.js 15, React 19, TypeScript y Tailwind CSS, desplegado como **export estático** sin servidor Node en producción.

El portal opera como aplicación autenticada por correo institucional usando Supabase Auth, con segmentación por establecimiento escolar y resolución automática de perfil desde la base maestra `BASE DE DATOS ESCUELAS SLEP`.

Experiencia principal:
1. Pantalla de acceso única (correo institucional vía Supabase)
2. Vínculo automático del usuario con su escuela
3. Acceso a módulos de resumen, programación, actas y métricas según perfil y RBD

---

## 2. Estado Actual del Producto (2026-04-27)

### Ya implementado y funcional

- Export estático con Next.js App Router (`output: "export"`)
- Autenticación por correo con Supabase Auth (magic link + OTP numérico)
- Callback explícito para magic link en `/auth/login/`
- Bootstrap de perfil desde la base maestra de escuelas
- Shell autenticado por establecimiento con navegación lateral
- Selector de escuela para ADMIN (`SchoolSelector`)
- Selector de escuela con búsqueda tipeable en la navegación lateral
- Acceso por representante de consejo escolar usando `CORREO REPRESENTANTE`
- Alcance por RBD para representantes: ven solo escuelas asociadas a su correo
- Acceso global adicional para correos presentes en `admin_user_roles`
- Shell principal adaptado a ancho completo de pantalla y navegación con logo institucional `SLEPCOLCHAGUA.webp`
- Rediseño parcial del shell y módulos compartidos para mejorar jerarquía, tablas, botones, carga y lectura operativa
- Persistencia de escuela seleccionada en navegación admin mediante `localStorage`
- Corrección de persistencia de `selectedRbd` para evitar que la escuela activa se limpie durante la carga inicial del perfil `ADMIN`
- Dropdown de escuelas diferenciado entre admin global y representante con alcance acotado por correo autenticado
- Panel admin agregado también acotado por escuelas y territorios del representante cuando no es admin global
- Sidebar con indicador explícito del tipo de acceso: `Admin global` o `Cobertura asignada`
- `PortalSnapshotProvider` — contexto de datos compartido, cero re-fetch al navegar, nunca se desmonta mientras exista sesión
- Navegación entre secciones sin flash visual ni pérdida de contenido (`app/loading.tsx` eliminado, `AppFrame` reestructurado)
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
  - Validación de RBD en submit para rol DIRECTOR
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
- Política de storage bucket `evidencias_actas` (escritura autenticada + lectura pública por RBD)
- Validación MIME real del PDF en servidor
- Activar `save_acta_complete` en el cliente (migración SQL lista)
- Aplicar en Supabase la migración `20260424_consejos_actas_registro_documental.sql` si aún no está corrida
- Cierre de redirect si Supabase Auth sigue apuntando al portal antiguo
- Endurecimiento de métricas según reglas de negocio finales
- Aplicar en Supabase la migración `20260424_consejos_representante_scope.sql` si aún no está corrida

---

## 3. Stack Técnico

### Frontend

- Next.js 15 con App Router
- React 19
- TypeScript 5
- Tailwind CSS 3
- Lucide React (iconos)

### Datos y autenticación

- Supabase Auth (magic link + OTP)
- Supabase Database (PostgreSQL + RLS)
- Supabase Storage (bucket `actas`)
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

**Invariante:** no duplicar lógica de sesión fuera de `auth-context.tsx`.

Detalle operativo vigente:
- `selectedRbd` se restaura desde `localStorage` solo para perfiles `ADMIN`
- esa persistencia no debe limpiarse mientras la sesión y el perfil todavía están resolviéndose
- si el usuario no es `ADMIN` o cierra sesión, la selección persistida sí se elimina

### 4.4 Snapshot de datos como contexto único

`PortalSnapshotProvider` vive en `app-frame.tsx`. Lee una sola vez al autenticar y expone `refresh()` para recargas explícitas. Las páginas solo consumen — nunca hacen fetch propio.

**Invariante:** las páginas no deben tener `useEffect` para cargar datos del portal — siempre usar `usePortalSnapshot()`.

### 4.4.1 Programación y correlativos

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

---

## 5. Estructura Relevante

### Rutas principales

| Ruta | Descripción |
|---|---|
| `/` | Pantalla de acceso pura |
| `/auth/login/` | Callback y entrada alternativa de auth |
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
| `lib/supabase/auth-context.tsx` | Sesión, perfil, establecimiento, auth flow |
| `lib/supabase/queries.ts` | `fetchPortalSnapshot`, mutaciones de `programacion`, `upsertActa`, `replaceActaInvitados`, uploads y delete |
| `lib/supabase/use-portal-snapshot.tsx` | Context Provider + `usePortalSnapshot()` hook |
| `lib/supabase/use-slep-directorio.ts` | Hook → RPC `get_slep_directorio()` |
| `types/domain.ts` | Tipos de dominio: `Acta`, `Profile`, `Establishment`, etc. |
| `tailwind.config.ts` | Tokens visuales del portal |
| `supabase/migrations/` | Historial de migraciones SQL |

### Mapa rápido para mejoras (guía para IA)

Usar esta sección como mapa operativo para ubicar rápido dónde tocar según el tipo de mejora.

| Quieres cambiar... | Empieza en... | Apoyo secundario |
|---|---|---|
| Login, OTP, magic link, sesión | `components/auth/auth-screen.tsx` | `lib/supabase/auth-context.tsx`, `app/auth/login/page.tsx` |
| Redirecciones y guardias globales | `components/portal/app-frame.tsx` | `lib/supabase/auth-context.tsx` |
| Navegación lateral, logo, selector de escuela, header contextual | `components/portal/shell.tsx` | `lib/supabase/use-slep-directorio.ts`, `lib/supabase/auth-context.tsx` |
| Persistencia de escuela seleccionada | `lib/supabase/auth-context.tsx` | `components/portal/shell.tsx`, `lib/supabase/use-portal-snapshot.tsx` |
| Precarga de establecimiento activo en nueva acta | `components/portal/acta-form.tsx` | `lib/supabase/auth-context.tsx`, `lib/supabase/use-slep-directorio.ts`, `app/actas/page.tsx` |
| Resumen del establecimiento | `app/resumen/page.tsx` | `components/portal/section-card.tsx`, `components/portal/attendance-chart.tsx` |
| Programación, calendario y acciones operativas | `app/programacion/page.tsx` | `components/portal/acta-form.tsx`, `lib/supabase/queries.ts` |
| Métricas y visualizaciones | `app/metricas/page.tsx` | `components/portal/attendance-chart.tsx`, `components/portal/section-card.tsx` |
| Panel admin y directorio SLEP | `app/admin/page.tsx` | `lib/supabase/use-slep-directorio.ts`, `types/domain.ts` |
| Listado, filtro y flujo de actas | `app/actas/page.tsx` | `components/portal/acta-form.tsx`, `components/portal/acta-detail.tsx`, `lib/supabase/queries.ts` |
| Formularios y persistencia de borradores | `components/portal/acta-form.tsx` | `components/ui/button.tsx`, `components/ui/toast.tsx` |
| Modal de confirmación | `components/portal/confirm-dialog.tsx` | `components/ui/button.tsx` |
| Estilos globales, skeletons, animaciones base | `app/globals.css` | `tailwind.config.ts` |
| Sistema visual de cards y bloques | `components/portal/section-card.tsx` | `components/portal/stat-card.tsx`, `tailwind.config.ts` |
| Botones, badges, toasts | `components/ui/button.tsx` | `components/ui/badge.tsx`, `components/ui/toast.tsx` |
| Fetch de snapshot portal | `lib/supabase/use-portal-snapshot.tsx` | `lib/supabase/queries.ts` |
| Consultas, mutaciones y uploads Supabase | `lib/supabase/queries.ts` | `lib/supabase/client.ts` |
| Directorio filtrado de escuelas | `lib/supabase/use-slep-directorio.ts` | `supabase/migrations/20260424_consejos_representante_scope.sql` |
| Roles, RLS, bootstrap y permisos | `supabase/migrations/20260424_consejos_representante_scope.sql` | `supabase/migrations/20260416_consejos_fix_rls_recursion.sql` |

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
- cualquier mejora de acceso o filtrado debe documentarse aquí y en este `context.md`

`types/`
- contratos de dominio que conectan frontend con la forma de los datos

### Rutas de trabajo frecuentes

Ruta 1 — mejorar navegación admin:
- `components/portal/shell.tsx`
- `lib/supabase/auth-context.tsx`
- `lib/supabase/use-slep-directorio.ts`

Ruta 2 — mejorar paneles visuales y consistencia:
- `app/globals.css`
- `components/portal/section-card.tsx`
- `components/ui/button.tsx`
- `tailwind.config.ts`

Ruta 3 — mejorar experiencia de datos por establecimiento:
- `lib/supabase/use-portal-snapshot.tsx`
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
- `supabase/migrations/20260424_consejos_representante_scope.sql`
- `lib/supabase/auth-context.tsx`
- `lib/supabase/use-slep-directorio.ts`

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
| `20260424_consejos_representante_scope.sql` | Acceso por representante + alcance por RBD + directorio SLEP filtrado |

---

## 6. Variables de Entorno

| Variable | Propósito |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Endpoint del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave pública para el cliente browser |
| `NEXT_PUBLIC_APP_NAME` | Nombre de app para metadata |
| `NEXT_PUBLIC_SITE_URL` | URL base para construir el redirect del magic link |

> `.env.example` es solo plantilla. El build toma `.env.local` o variables del pipeline. Un build sin `NEXT_PUBLIC_SITE_URL` construirá el redirect desde `window.location.origin` en cliente.

---

## 7. Flujo de Autenticación

### 7.1 Solicitud de acceso

`sendOtp(email)` en `auth-context.tsx`:
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

Desde 2026-04-24 el bootstrap admite tres casos:
- correo en `admin_correos` o `admin_user_roles` → `ADMIN` global
- correo presente en `CORREO REPRESENTANTE` → `ADMIN` con alcance limitado por RBD
- correo de director en base maestra → `DIRECTOR` con un solo RBD

### 7.5 Redirecciones en AppFrame

| Condición | Acción |
|---|---|
| Sin sesión + ruta no es acceso | Redirige a `/` |
| Con sesión + ruta es `/` o `/auth/login/` | Redirige a `/resumen/` |
| Resolviendo sesión | Estado de loading |
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

### Avance 2 — Acceso por representante de consejo escolar

Se agregó la migración `20260424_consejos_representante_scope.sql` con este objetivo:
- permitir acceso a correos presentes en `CORREO REPRESENTANTE`
- permitir acceso global a correos presentes en `admin_user_roles`
- construir un perfil autenticado aun cuando el usuario no sea director
- limitar la visibilidad a las escuelas asociadas a ese correo

Funciones nuevas o redefinidas:
- `is_global_admin()`
- `current_accessible_rbds()`
- `has_school_scope_access(target_rbd)`
- `is_admin()` ahora equivale a admin global, no a representante con alcance parcial
- `bootstrap_current_user_profile_from_base_escuelas()` ahora contempla admin global, representante y director

Detalle adicional del criterio de admin global:
- primero se revisa `admin_correos`
- luego se revisa `admin_user_roles` si la tabla existe en la base
- la búsqueda en `admin_user_roles` tolera columnas `correo_electronico`, `email` o `correo`

### Avance 3 — Endurecimiento de RLS por alcance

Se reemplazó la lógica que daba acceso global a todo `rol = 'ADMIN'` por una verificación explícita de RBD accesibles.

Tablas y superficies endurecidas:
- `establecimientos`
- `programacion`
- `actas`
- `actas_invitados`
- `logs`
- `storage.objects` para bucket `evidencias_actas`
- RPC `get_slep_directorio()`

Resultado esperado:
- un representante puede entrar con perfil administrativo de navegación
- pero solo puede ver o mutar datos de sus escuelas asociadas

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
- `lib/supabase/auth-context.tsx`

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
- `lib/supabase/auth-context.tsx`
- `lib/supabase/use-slep-directorio.ts`

Trabajo realizado:
- se agregó `isGlobalAdmin` al contexto de autenticación
- `auth-context.tsx` consulta la RPC `is_global_admin()` cuando el perfil autenticado es `ADMIN`
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
- el header contextual deja de comunicar “cobertura completa” para usuarios acotados y muestra cobertura asignada
- la página `/admin` cambia su título, descripción y copy para reflejar que la vista agregada está limitada a escuelas/comunas autorizadas
- se agregó un banner explicativo en el panel admin para usuarios con cobertura parcial

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
  - `Cobertura asignada`
- se incorporó un `Badge` de apoyo visual:
  - `Admin global`
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
- `lib/supabase/auth-context.tsx`

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
- `lib/supabase/use-portal-snapshot.tsx`
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
- `lib/supabase/use-portal-snapshot.tsx`
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

## 9. Riesgos y Observaciones Actuales

- La migración `bootstrap_current_user_profile_from_base_escuelas()` se redefine varias veces en el historial; la definición efectiva es la última aplicada.
- Si la migración `20260424_consejos_representante_scope.sql` no se ejecuta en la base real, el frontend seguirá mostrando el comportamiento anterior.
- El rol persistido para representantes es `ADMIN`, pero la seguridad real ya no depende solo del rol sino de `has_school_scope_access(...)`.
- `usuarios_perfiles` sigue permitiendo lectura completa solo a admins globales; el representante solo puede leer su propio perfil.
- `admin_user_roles` no está definido en este repo; la migración quedó defensiva y solo lo consulta si la tabla existe en la base real.
- El shell principal ya no depende de un ancho máximo fijo; futuras vistas deben respetar esa expansión y evitar wrappers internos demasiado angostos.
- La escuela activa en contexto ya es una dependencia funcional del flujo de actas; cualquier cambio en `selectedRbd` debe validarse también abriendo `Nueva acta`.
- Si una mejora toca experiencia y permisos al mismo tiempo, actualizar siempre este `context.md` además del archivo funcional y la migración SQL correspondiente.
- Si la migración `20260424_consejos_actas_registro_documental.sql` no está aplicada, el frontend híbrido quedará desalineado con la base y fallarán `modo_registro`, `observacion_documental` o los horarios nullable.
- `lib/supabase/queries.ts` es el punto canónico del snapshot y de las mutaciones de actas; no debe reemplazarse con implementaciones externas ni imports a `@/utils/...`.
- El flujo documental depende de que `link_acta` exista al guardar; cualquier relajación futura debe coordinarse simultáneamente entre UI, migración y RPC SQL.
- Las métricas del portal ahora distinguen entre completitud y registro documental; cualquier KPI nuevo debe decidir explícitamente si cuenta ambos modos o solo `ACTA_COMPLETA`.
- **No agregar `app/loading.tsx`** a nivel del directorio `app/`. Su presencia rompe la continuidad visual entre navegaciones. Si se necesita skeleton, hacerlo dentro del `page.tsx` correspondiente.
- `PortalSnapshotProvider` debe permanecer como envoltura exterior de todas las ramas autenticadas en `AppFrame`. No moverlo dentro de ramas condicionales.
- La clase `panel-reveal` sigue disponible en CSS para usos puntuales (primera carga, animaciones de modales), pero no debe aplicarse a componentes que se remontan en cada navegación.

---

## 10. Modelo de Datos y Dominio

### Entidades principales

| Tabla | Descripción |
|---|---|
| `establecimientos` | Escuelas del SLEP (derivada de la base maestra) |
| `usuarios_perfiles` | Perfil extendido del usuario autenticado |
| `programacion` | Planificación de sesiones de Consejo |
| `actas` | Actas oficiales de sesiones |
| `actas_invitados` | Invitados externos por acta |
| `logs` | Registro de acciones del portal |
| `BASE DE DATOS ESCUELAS SLEP` | Tabla maestra (fuente de verdad para establecimientos y usuarios) |

### Tipos funcionales expuestos al frontend (`types/domain.ts`)

```ts
type UserRole      = "ADMIN" | "DIRECTOR"
type SessionType   = "Ordinaria" | "Extraordinaria"
type SessionFormat = "Presencial" | "Online" | "Híbrido"
type PlanningStatus = "PROGRAMADA" | "REALIZADA" | "CANCELADA"
type ActaRecordMode = "ACTA_COMPLETA" | "REGISTRO_DOCUMENTAL"
```

### Reglas de negocio modeladas

- La identidad del establecimiento gira alrededor del `RBD`
- El rol `DIRECTOR` queda acotado a su propio RBD en toda escritura
- El rol `ADMIN` puede ver y gestionar datos de cualquier establecimiento
- El N° de sesión se calcula del servidor (`count(actas por rbd+tipo) + 1`) — nunca editable en UI
- Los PDFs de evidencia viven en el bucket `actas` con path `{rbd}/{año}/{actaId}.pdf`
- `ACTA_COMPLETA` y `REGISTRO_DOCUMENTAL` comparten la misma tabla `actas` y el mismo correlativo operativo
- `REGISTRO_DOCUMENTAL` exige documento adjunto y puede omitir horario detallado y contenido estructurado
- `AttendeeSlot` ahora puede incluir `rut` para trazabilidad mínima de asistentes presentes

---

## 9. Integración con la Base Maestra de Escuelas

La autenticación depende operativamente de `public."BASE DE DATOS ESCUELAS SLEP"`.

### Funciones SQL de integración

| Función | Propósito |
|---|---|
| `normalize_portal_email(raw_email)` | Normaliza correo para matching |
| `base_escuelas_normalized_rows()` | Lee filas normalizadas de la base maestra |
| `sync_establecimientos_from_base_escuelas()` | Sincroniza tabla `establecimientos` |
| `bootstrap_current_user_profile_from_base_escuelas()` | Crea/actualiza `usuarios_perfiles` |
| `get_slep_directorio()` | RPC para el selector de establecimientos en formularios |

### Dependencias de la base maestra

Columnas necesarias para matching:
- `RBD`
- Nombre del establecimiento
- Correo del director/responsable (variantes aceptadas: `CORREO ELECTRONICO`, `CORREO`, `EMAIL`)

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
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (SELECT 1 FROM public.usuarios_perfiles WHERE id = auth.uid() AND rol = 'ADMIN');
$$;

CREATE OR REPLACE FUNCTION public.current_user_rbd() RETURNS text
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT rbd FROM public.usuarios_perfiles WHERE id = auth.uid();
$$;
```

### Alcance de las políticas RLS

| Tabla | Lectura | Escritura |
|---|---|---|
| `establecimientos` | Admin o RBD propio | Admin |
| `usuarios_perfiles` | Perfil propio o admin | Perfil propio (bootstrap via función) |
| `programacion` | Por RBD o admin | Por RBD o admin |
| `actas` | Por RBD o admin | Por RBD o admin |
| `actas_invitados` | Ligado al acta visible | Ligado al acta del RBD |
| `logs` | Por alcance correspondiente | Por alcance correspondiente |

### Capas de protección en el módulo de actas

1. RLS en `actas` y `actas_invitados`
2. RPC `save_acta_complete` con validación de RBD explícita (SECURITY DEFINER)
3. Validación cliente en `handleSubmit` (`profile.rbd === form.rbd` para DIRECTOR)
4. Rate limit cliente 3 s entre guardados
5. Sanitización de todos los campos de texto antes de persistir
6. Render como texto plano en JSX (React escapa automáticamente)

### Storage

- Bucket: `actas`
- Path: `{rbd}/{año}/{actaId}.pdf`
- El primer segmento del path debe ser el RBD del usuario
- **Política pendiente:** debe crearse en Supabase para escritura autenticada y lectura pública por RBD

---

## 12. Diseño Visual y Branding

### Tipografía

Fuente local (no Google Fonts):
- `MuseoSans-100.woff`, `MuseoSans-500.woff`, `MuseoSans-700.woff`, `MuseoSans-900.woff`
- Variable: `--font-museo-sans`

### Paleta Tailwind

| Token | Color | Uso |
|---|---|---|
| `ink` | `#0b1526` | Texto principal |
| `mist` | `#eef4fb` | Fondos de sección |
| `ocean` | `#0f69b4` | Primario (acciones, links) |
| `sand` | `#ffffff` | Superficies |
| `ember` | `#ff1d3d` | Errores, acciones destructivas |
| `pine` | `#0f69b4` | Alias de ocean |

### Fondo y ambiente

`globals.css` define:
- Gradientes azulados con acento rojo sutil
- Grid fino fijo sobre la interfaz
- Selección de texto azul
- `@media print`: oculta nav/sidebar, fondo blanco, A4

### Componentes UI propios

| Componente | Variantes |
|---|---|
| `Button` | `primary`, `secondary`, `ghost` |
| `Badge` | `success`, `warn`, `info`, y más según `badge.tsx` |
| `Toaster` / `toast()` | `success`, `error`, `info` |
| `ConfirmDialog` | `tone: "default" | "danger"` |

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

### 14.7 El objeto `session` de Supabase se reemplaza en cada renovación de JWT

El `useEffect` de carga de acceso en `auth-context.tsx` depende de `userId` (estable) en lugar de `session` (se reemplaza aunque el usuario no cambie). Cambiar esta dependencia causa el flash "Resolviendo sesión…" en cada navegación.

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

---

## 17. Riesgos y Restricciones Actuales

### Riesgos técnicos

- Configuración de Supabase Auth apuntando a dominio antiguo
- Desalineación entre datos reales y columnas inferidas de la base maestra
- Dependencia total del navegador para auth y fetch (export estático)
- Builds viejos cacheados en producción si las variables cambian
- Bucket `actas` sin política → cualquier usuario autenticado puede escribir en cualquier path

### Restricciones operativas

- Cambios de redirect del correo requieren revisión de Supabase Auth además del código
- El portal no puede depender de server-side rendering para ningún flujo de datos
- Cualquier nueva función helper usada en RLS debe tener `SECURITY DEFINER`

---

## 18. Checklist Operativo para Continuar

1. Confirmar `NEXT_PUBLIC_SITE_URL` con el dominio real del portal.
2. Verificar en Supabase Auth: `Site URL` y `Redirect URLs`.
3. Confirmar que usuarios institucionales existan en Supabase Auth.
4. Confirmar que `BASE DE DATOS ESCUELAS SLEP` tenga RBD y correos útiles.
5. Crear política del bucket `actas` (escritura autenticada por RBD, lectura pública).
6. Ejecutar `supabase db push` para aplicar `20260418_save_acta_atomic.sql`.
7. Migrar `handleSubmit` en `acta-form.tsx` a usar `.rpc('save_acta_complete', {...})`.
8. Agregar columna `correo` a `actas_invitados` y persistirla desde el formulario.
9. Implementar eliminación de PDF en storage cuando se borra un acta.
10. Alinear `README.md` con el estado real del portal.

---

## 19. Convenciones para Futuras Ediciones

- Mantener compatibilidad con export estático en todo momento.
- Todo nuevo módulo de datos: consumir `usePortalSnapshot()` — nunca fetch propio.
- Toda nueva función helper de RLS: `SECURITY DEFINER` + `SET search_path = public`.
- Toda acción destructiva desde UI: usar `ConfirmDialog` con `tone="danger"`.
- Todo feedback post-mutación: usar `toast()`.
- Toda UI que podría tener cambios no guardados: implementar dirty guard con `initialFormRef`.
- Mantener la pantalla de acceso como pantalla pura, sin contenido informativo.
- Preservar la coherencia visual: contraste alto, jerarquía fuerte, superficies limpias, blur controlado.
- `DataBanner` solo para errores reales — no silenciar errores reales, no mostrar éxito ni vacío.
- Los borradores de formulario van a `localStorage` — solo para formularios de creación, no edición.
