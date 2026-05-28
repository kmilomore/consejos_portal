# Contexto Operativo: Auditoria admin

> Ultima actualizacion: 2026-05-28  
> Objetivo: formalizar la pantalla `/admin/auditoria/` como punto unico de trazabilidad para eventos operativos del portal y cambios de acceso administrativos.  
> Contexto general del portal: ver `../../context.md` para arquitectura global, seguridad y contratos transversales.

---

## 1. Proposito del modulo

La pantalla `/admin/auditoria/` existe para responder tres preguntas operativas sin reconstruir eventos a mano:

- quien ingreso al portal
- que accion ejecuto en el portal
- que acceso admin creo, modifico o desactivo

La pantalla no reemplaza la seguridad real ni corrige datos. Su funcion es dar trazabilidad de lectura para admin global.

---

## 2. Contrato de acceso

### Quien puede entrar

Solo un `ADMIN` global puede usar esta pantalla.

Guardias vigentes:

- cliente: `app/admin/auditoria/page.tsx` redirige a `/admin/` si `isGlobalAdmin === false`
- shell: `components/portal/shell.tsx` solo muestra el item de navegación si `canManageUsers === true`
- RLS: `portal_access_audit` expone lectura solo a `public.is_global_admin()`

### Que cubre hoy

- eventos de `logs` ya existentes en el portal (`LOGIN`, `CREAR_ACTA`, `EDITAR_ACTA`, `ELIMINAR_ACTA`)
- cambios de acceso sobre `usuario_establecimiento_roles` a traves de `portal_access_audit`

### Que no cubre aun

- navegación fina por cada click o vista abierta
- diffs exhaustivos de JSON libre dentro de `metadata`
- observabilidad centralizada fuera de Supabase

---

## 3. Archivos fuente de verdad

### UI principal

- `app/admin/auditoria/page.tsx`  
  Carga ambos orígenes, construye una línea de tiempo unificada y aplica filtros de búsqueda/fuente.

### Capa de datos

- `lib/supabase/queries.ts`
  - `listPortalLogs(limit?)`
  - `listPortalAccessAudit(limit?)`

### Tipos de dominio

- `types/domain.ts`
  - `LogEntry`
  - `PortalAccessAuditEntry`
  - `PortalAccessAuditSnapshot`

### Contrato SQL y seguridad

- `supabase/migrations/20260415_consejos_escolares.sql` — tabla `logs`
- `supabase/migrations/20260528_consejos_portal_access_audit.sql` — tabla, trigger y policy de `portal_access_audit`

---

## 4. Modelo mental del modulo

La pantalla junta dos fuentes distintas:

### 4.1 Eventos operativos del portal

Salen de `logs`.

Sirven para saber:

- que usuario opero sobre un `RBD`
- si inicio sesión
- si creó, editó o eliminó un acta

### 4.2 Cambios de acceso administrativo

Salen de `portal_access_audit`.

Sirven para saber:

- que admin global ejecutó la acción
- sobre que correo/rol/RBD se actuó
- si fue creación, actualización o desactivación
- que campos resumidos cambiaron

---

## 5. Flujo de datos real

Cuando `isGlobalAdmin === true`, la página dispara una carga paralela:

1. `listPortalLogs(80)`
2. `listPortalAccessAudit(80)`
3. ambos datasets se normalizan a una misma estructura de timeline
4. el cliente ordena por fecha descendente
5. la tabla permite filtrar por texto y por fuente

Si una fuente falla y la otra no:

- la página mantiene la fuente que sí respondió
- se muestra alerta de carga parcial

Esto evita dejar al admin sin ninguna trazabilidad solo porque falte una migración.

---

## 6. Tabla `portal_access_audit`

### Columnas persistidas

| columna | tipo | descripcion |
|---|---|---|
| `id` | uuid | PK del evento |
| `access_id` | uuid | FK a `usuario_establecimiento_roles.id` |
| `admin_email` | text | correo capturado desde `auth.jwt()` o `system` |
| `accion` | text | `CREADO`, `ACTUALIZADO`, `DESACTIVADO` |
| `snapshot_antes` | jsonb | resumen del acceso anterior |
| `snapshot_despues` | jsonb | resumen del acceso posterior |
| `created_at` | timestamptz | fecha del evento |

### Trigger

`log_portal_access_change()` corre `AFTER INSERT OR UPDATE` sobre `usuario_establecimiento_roles`.

Reglas:

- `INSERT` => `CREADO`
- `UPDATE` con `activo` de `true` a `false` => `DESACTIVADO`
- cualquier otro `UPDATE` => `ACTUALIZADO`

---

## 7. Invariantes del modulo

1. la auditoría es de solo lectura desde cliente
2. la fuente de verdad de cambios de acceso es `portal_access_audit`, no la inferencia visual de `/admin/usuarios/`
3. la fuente de verdad de eventos operativos sigue siendo `logs`
4. si falta la migración nueva, la página debe degradar con error visible pero sin romper el resto del portal
5. la navegación del shell debe mantener slash final consistente: `/admin/auditoria/`

---

## 8. Checklist para tocar este modulo

Antes de editar:

1. revisar `../../context.md`
2. revisar `../../docs/contexto-general.md`
3. revisar este archivo
4. confirmar si la migración `20260528_consejos_portal_access_audit.sql` ya está aplicada

Si tocas persistencia:

1. validar trigger `log_portal_access_change()`
2. validar policy select de `portal_access_audit`
3. validar que `listPortalLogs()` y `listPortalAccessAudit()` sigan degradando con error legible

Si tocas UI:

1. preservar el guard de `isGlobalAdmin`
2. preservar filtros por fuente y búsqueda
3. no mezclar rutas con y sin slash final

Validación mínima esperada:

1. `npm run lint`
2. `npm run build`
3. prueba manual de navegación a `/admin/auditoria/`
4. prueba manual de alta/edición/desactivación de usuario y revisión del timeline

---

## 9. Riesgos y límites actuales

- `logs` depende de que las mutaciones operativas realmente inserten eventos; la pantalla no inventa historial faltante
- `LOGIN` aparece solo si ese evento se registra en la tabla `logs`
- la comparación de cambios de acceso resume campos principales; no presenta un diff profundo del JSON `metadata`
- si se consulta desde una base sin la migración nueva, el módulo mostrará carga parcial hasta aplicarla