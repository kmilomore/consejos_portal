# Contexto del Proyecto: Consejos

> **Última actualización:** 2026-04-24  
> **Fuente de verdad:** este archivo. El README.md está desactualizado.

---

## 1. Resumen Ejecutivo

`Consejos/` es un portal de Consejos Escolares construido con Next.js 15, React 19, TypeScript y Tailwind CSS, desplegado como **export estático** sin servidor Node en producción.

El portal opera como aplicación autenticada por correo institucional usando Supabase Auth, con segmentación por establecimiento escolar y resolución automática de perfil desde la base maestra `BASE DE DATOS ESCUELAS SLEP`.

Experiencia principal:
1. Pantalla de acceso única (correo institucional vía Supabase)
2. Vínculo automático del usuario con su escuela
3. Acceso a módulos de resumen, programación, actas y métricas según perfil y RBD

---

## 2. Estado Actual del Producto (2026-04-24)

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
- `PortalSnapshotProvider` — contexto de datos compartido, cero re-fetch al navegar
- Módulo de actas completo:
  - Crear, editar, ver (solo lectura) y eliminar actas
  - Búsqueda y filtros en el listado
  - Asistencia estamental con validación de RUT (módulo-11 chileno)
  - Quórum en tiempo real (4/6 mínimo)
  - Grilla dinámica de invitados
  - Upload de PDF con drag & drop
  - Borrador persistido en `localStorage`
  - Guardia de cambios sin guardar (dirty guard)
  - Toast de confirmación post-guardado
  - Vista de solo lectura con impresión A4
  - Eliminación con confirmación
  - Rate limit cliente-side (cooldown 3 s)
  - Validación de RBD en submit para rol DIRECTOR
  - Sanitización de texto antes de persistir
- Sistema de toasts global (`toast()` + `<Toaster>`)
- `ConfirmDialog` reutilizable
- Branding institucional: Museo Sans local, paleta azul/blanco/rojo
- `@media print` para impresión de actas
- RPC `save_acta_complete` (migración creada, pendiente activar en cliente)

### Pendiente o parcial

- Eliminar PDF en storage al borrar acta (el DELETE en BD sí funciona)
- CRUD de programación (solo lectura implementada)
- Vínculo UI entre programación y acta (`id_programacion_origen` existe sin selector)
- Columna `correo` en `actas_invitados` (capturado en UI, no persiste)
- Política de storage bucket `actas` (escritura autenticada + lectura pública por RBD)
- Validación MIME real del PDF en servidor
- Activar `save_acta_complete` en el cliente (migración SQL lista)
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

### 4.4 Snapshot de datos como contexto único

`PortalSnapshotProvider` vive en `app-frame.tsx`. Lee una sola vez al autenticar y expone `refresh()` para recargas explícitas. Las páginas solo consumen — nunca hacen fetch propio.

**Invariante:** las páginas no deben tener `useEffect` para cargar datos del portal — siempre usar `usePortalSnapshot()`.

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
| `lib/supabase/queries.ts` | `fetchPortalSnapshot`, `upsertActa`, `replaceActaInvitados`, `uploadActaPdf`, `deleteActa` |
| `lib/supabase/use-portal-snapshot.tsx` | Context Provider + `usePortalSnapshot()` hook |
| `lib/supabase/use-slep-directorio.ts` | Hook → RPC `get_slep_directorio()` |
| `types/domain.ts` | Tipos de dominio: `Acta`, `Profile`, `Establishment`, etc. |
| `tailwind.config.ts` | Tokens visuales del portal |
| `supabase/migrations/` | Historial de migraciones SQL |

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

---

## 9. Riesgos y Observaciones Actuales

- La migración `bootstrap_current_user_profile_from_base_escuelas()` se redefine varias veces en el historial; la definición efectiva es la última aplicada.
- Si la migración `20260424_consejos_representante_scope.sql` no se ejecuta en la base real, el frontend seguirá mostrando el comportamiento anterior.
- El rol persistido para representantes es `ADMIN`, pero la seguridad real ya no depende solo del rol sino de `has_school_scope_access(...)`.
- `usuarios_perfiles` sigue permitiendo lectura completa solo a admins globales; el representante solo puede leer su propio perfil.
- `admin_user_roles` no está definido en este repo; la migración quedó defensiva y solo lo consulta si la tabla existe en la base real.

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
```

### Reglas de negocio modeladas

- La identidad del establecimiento gira alrededor del `RBD`
- El rol `DIRECTOR` queda acotado a su propio RBD en toda escritura
- El rol `ADMIN` puede ver y gestionar datos de cualquier establecimiento
- El N° de sesión se calcula del servidor (`count(actas por rbd+tipo) + 1`) — nunca editable en UI
- Los PDFs de evidencia viven en el bucket `actas` con path `{rbd}/{año}/{actaId}.pdf`

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
