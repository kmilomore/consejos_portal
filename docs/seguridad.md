# Seguridad del Portal

> Ultima actualizacion: 2026-07-02
> Objetivo: concentrar en un solo documento la postura de seguridad del portal, sus controles efectivos, riesgos identificados y referencias tecnicas relacionadas.

---

## 1. Principio rector

El portal debe operar con seguridad por defecto.

Eso implica tres reglas:

1. no confiar en el navegador como fuente de verdad de acceso
2. resolver autorizacion real en backend y RLS
3. minimizar exposicion publica de datos y permisos

---

## 2. Autenticacion

### Mecanismo

- Supabase Auth
- Google OAuth
- sesion resuelta en cliente y validada por Supabase

### Hallazgo importante

El parametro `hd` de Google solo funciona como sugerencia de frontend. No garantiza por si mismo que el usuario pertenezca al dominio permitido.

Documento relacionado:
- [Contexto raiz del proyecto](../context.md)

---

## 3. Autorizacion efectiva

La autorizacion real del portal no depende del texto visible en el cliente. Depende del backend de Supabase.

### Fuente efectiva de alcance

- `usuario_establecimiento_roles`
- `is_global_admin()`
- `has_global_readonly_access()`
- `current_accessible_rbds()`
- `has_school_scope_access(...)`
- `has_school_write_access(...)`
- `get_current_portal_scope()`

El frontend solo consume el resultado de ese contrato.

---

## 4. Endurecimiento aplicado el 2026-05-27

Se agrego la migracion:

- [Hardening de seguridad](../supabase/migrations/20260527_consejos_security_defaults_hardening.sql)

Esta migracion hace lo siguiente:

### 4.1 Dominio institucional exigido en backend

- define `portal_allowed_email_domain()`
- define `is_portal_allowed_email(...)`
- exige dominio institucional antes de resolver acceso real

### 4.2 Funciones de acceso reforzadas

Redefine las funciones efectivas para que no otorguen alcance a correos fuera del dominio permitido:

- `is_global_admin()`
- `has_global_readonly_access()`
- `current_accessible_rbds()`
- `has_school_scope_access(...)`
- `has_school_write_access(...)`
- `get_current_portal_scope()`
- `bootstrap_current_user_profile_from_base_escuelas()`
- `upsert_usuario_establecimiento_rol(...)`

### 4.3 Gestion manual endurecida

La carga manual de accesos ya no debe aceptar correos fuera del dominio institucional configurado.

---

## 5. RLS y alcance por datos

### Lectura

La lectura de datos debe pasar por alcance efectivo de escuela o por permisos globales controlados.

Se aplica a:

- `establecimientos`
- `programacion`
- `actas`
- `actas_invitados`
- `logs`
- `storage.objects` del bucket `evidencias_actas`

### Escritura

La escritura se limita a usuarios con permisos reales sobre la escuela objetivo.

Se apoya en:

- `has_school_write_access(...)`

### Bitacora de eventos (`logs`) — desde 2026-07-02

La escritura de la bitacora no depende del alcance por RBD: pasa por la RPC `log_portal_event()` (`SECURITY DEFINER`, grant solo a `authenticated`), definida en `20260702_consejos_portal_event_log.sql` y aplicada en produccion.

Propiedades de seguridad:

- el actor (`usuario`) se deriva siempre del email del JWT en el servidor; el payload del cliente no puede suplantar identidad
- whitelist de acciones dentro de la funcion; `CREAR_CUENTA` esta excluido y solo lo escribe el trigger `trg_log_new_auth_user` sobre `auth.users`
- ese trigger silencia toda excepcion: un fallo de bitacora jamas bloquea un signup
- dedupe de `LOGIN` en servidor (ventana de 5 minutos por usuario) para evitar inflar la bitacora
- la lectura sigue gobernada por la policy existente (admin global via la pantalla `/admin/auditoria/`)

---

## 6. Exposicion publica de datos

### Hallazgo documentado

Existia una migracion que habilitaba lectura `anon` sobre datos operativos:

- [Lectura publica establecimientos](../supabase/migrations/20260416_consejos_public_read_anon.sql)

Ese archivo creaba lectura publica para:

- `establecimientos`
- `programacion`
- `actas`
- `actas_invitados`

### Correccion aplicada

La nueva migracion de hardening elimina esas politicas publicas mediante `drop policy if exists ...` para restaurar el principio de minimo privilegio.

### Hallazgo cerrado en auditoria en vivo (2026-07-02)

Pese al hardening del 2026-05-27, en produccion existian politicas SELECT creadas fuera de las migraciones de Consejos (proyecto Supabase compartido con `portal-participacion`):

- `anon_select_directorio` sobre `actas` (`USING true`, rol `anon`): las 125 actas eran legibles sin sesion con la anon key del frontend
- `actas_select_portal_authenticated` (`USING true`, rol `authenticated`): lectura amplia para cualquier sesion institucional

Correccion aplicada el mismo dia (migracion `20260702_consejos_close_anon_actas_and_base_escuelas_write.sql`, ya en produccion):

- eliminada la politica `anon` de `actas`; verificado via REST que anon recibe 0 filas
- la lectura de actas queda **solo con sesion autenticada** (decision explicita: se conserva `actas_select_portal_authenticated` para usuarios institucionales logueados, mas `Leer actas por rbd` como alcance acotado)
- la escritura nunca estuvo comprometida (`has_school_write_access` intacta)

En la misma migracion se cerro la escritura abierta de `"BASE DE DATOS ESCUELAS SLEP"` (UPDATE/INSERT con `true` para cualquier autenticado): ahora la gobierna `is_base_escuelas_editor()` (roles `admin/coordinador/fi/be` de `auth_users_roles` de portal-participacion + admin global de Consejos). Esto protege la lista blanca de directores de alteraciones silenciosas via sync.

### Superficie publica intencional (2026-07-02)

Desde 2026-07-02 existen rutas publicas por diseno, sin sesion:

- `/` (landing informativa), `/terminos/`, `/privacidad/` y `/cookies/`

Caracteristicas de seguridad de esa superficie:

- contenido 100% estatico: no consulta Supabase, no expone tablas ni RPC, no guarda datos del visitante
- las rutas publicas se declaran explicitamente en `isPublicRoute` de `components/portal/app-frame.tsx`; cualquier otra ruta sin sesion redirige a `/auth/login/`
- las paginas legales documentan el tratamiento de datos y el almacenamiento local real del portal (Leyes 19.628, 21.719 y 21.663); si cambia el storage del cliente o se agrega analitica, `/cookies/` debe actualizarse en el mismo cambio
- la Ley 21.663 (Marco de Ciberseguridad) queda declarada como marco de reporte de incidentes; el canal publicado es provisional (`contacto@slepcolchagua.cl`) y debe confirmarse

Documento operativo:
- [Contexto de la landing publica](../components/landing/context-landing.md)

---

## 7. Storage

El bucket operativo es:

- `evidencias_actas`

La lectura y escritura de archivos debe alinearse con el alcance real del usuario y no con un simple estado del cliente.

Documentos relacionados:

- [Contexto de actas](../app/actas/context-actas.md)
- [Contexto raiz del proyecto](../context.md)

---

## 8. XSS y frontend

### Estado general

- React mitiga renderizado inseguro de texto por defecto
- no debe asumirse que eso reemplaza una politica global de hardening

### Riesgo residual

El portal no debe introducir renderizado HTML arbitrario ni confiar en sanitizaciones cosmeticas.

Documento relacionado:
- [Contexto general unificado](./contexto-general.md)

---

## 9. CORS

El portal es estatico. Por eso CORS no se controla principalmente desde esta app.

El control real depende de:

- Supabase
- hosting o CDN
- cualquier servicio remoto consumido por el frontend

Esto debe revisarse fuera del repo cuando se valide el despliegue real.

---

## 10. Estado verificado en produccion (auditoria en vivo 2026-07-02)

Auditoria directa contra el proyecto Supabase via Management API (detalle del metodo y hallazgos completos en `context.md` §9.y):

- RLS activo en las 9 tablas; todas las funciones RLS en su version final (gate de dominio, separacion lectura/escritura, fallback de director)
- politicas de storage de `evidencias_actas` = migracion definitiva `20260619`
- todas las migraciones de permisos listadas antes como "por confirmar" estan aplicadas
- trigger `portal_access_audit_trigger` activo
- tuberia de eventos de auditoria verificada el mismo dia: enum `log_action` con 11 valores, RPC `log_portal_event` con grants correctos (`authenticated`, sin `anon`) y trigger `trg_log_new_auth_user` activo sobre `auth.users`
- Supabase Auth: `disable_signup: false` + Google OAuth habilitado; el flujo *lista blanca primero, registro automatico en el primer login* funciona de punta a punta; redirect de Consejos en la allow-list
- deny by default verificado: usuarios de Auth sin rol en Consejos no ven datos

---

## 11. Riesgos pendientes

- **bucket `evidencias_actas` es publico** (131 PDFs descargables por URL sin sesion); cerrarlo requiere bucket privado + `createSignedUrl()` en `lib/supabase/queries.ts`
- **`"BASE DE DATOS ESCUELAS SLEP"` sigue legible por `anon`** (correos de directores/representantes expuestos); confirmar con portal-participacion antes de cerrar su SELECT
- **validar los 69 correos de la lista blanca de directores** contra sus cuentas Google reales (caso detectado: `ximena.lopez` en la lista vs `ximena.pino` en Auth para el mismo RBD)
- ejecutar el plan de corte del sync con la planilla maestra (`context.md` §9.x)
- revisar configuracion real de CORS en Supabase y hosting
- evaluar una politica CSP compatible con export estatico

---

## 12. Documentos relacionados

### Vista global

- [Centro de documentacion](./README.md)
- [Contexto general unificado](./contexto-general.md)
- [Contexto raiz del proyecto](../context.md)

### Modulos

- [Contexto de la landing publica](../components/landing/context-landing.md)
- [Contexto de usuarios](../app/admin/context-usuarios.md)
- [Contexto de programacion](../app/programacion/context_programacion.md)
- [Contexto de actas](../app/actas/context-actas.md)
- [Contexto de metricas](../app/metricas/context_metricas.md)

### SQL relevante

- [Hardening de seguridad](../supabase/migrations/20260527_consejos_security_defaults_hardening.sql)
- [Cierre de lectura anon en actas y escritura de planilla maestra](../supabase/migrations/20260702_consejos_close_anon_actas_and_base_escuelas_write.sql)
- [Lectura publica anon historica](../supabase/migrations/20260416_consejos_public_read_anon.sql)
