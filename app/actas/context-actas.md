# Contexto: Módulo de Actas — Consejos Escolares

> **Última actualización:** 2026-04-18  
> **Sprint:** Optimización, seguridad y UI (ítems 4, 7, 8, 11, 12, 23, 25, 27, 29, 34, 38)

---

## 1. Propósito

El módulo de actas cubre el **Flujo 02** del portal: registro, edición, consulta y eliminación de actas oficiales de sesiones de Consejo Escolar. Cada acta documenta la asistencia estamental, los temas tratados, los acuerdos alcanzados y la evidencia documental oficial en formato PDF.

---

## 2. Archivos Involucrados

| Archivo | Rol |
|---|---|
| `app/actas/page.tsx` | Página listado + búsqueda/filtro + acciones por tarjeta |
| `components/portal/acta-form.tsx` | Drawer lateral con formulario completo |
| `components/portal/acta-detail.tsx` | Panel de solo lectura + impresión |
| `components/portal/confirm-dialog.tsx` | Modal de confirmación reutilizable |
| `components/ui/toast.tsx` | Sistema de toasts global (función `toast()`) |
| `components/portal/shell.tsx` | Sidebar con selector de escuela admin (`SchoolSelector`) |
| `components/portal/data-banner.tsx` | Banner de estado (solo errores reales) |
| `lib/supabase/queries.ts` | Mutaciones: `upsertActa`, `replaceActaInvitados`, `uploadActaPdf`, `deleteActa` |
| `lib/supabase/use-portal-snapshot.tsx` | Contexto compartido; expone `refresh()` |
| `lib/supabase/use-slep-directorio.ts` | Hook que llama RPC `get_slep_directorio()` |
| `lib/supabase/auth-context.tsx` | Sesión, `profile`, `selectedRbd`, `setSelectedRbd` |
| `types/domain.ts` | Tipos `Acta`, `AttendeeSlot`, `InvitedGuest`, `SlepEscuela` |
| `supabase/migrations/20260415_consejos_escolares.sql` | Tablas `actas` y `actas_invitados` |
| `supabase/migrations/20260418_save_acta_atomic.sql` | RPC `save_acta_complete` (transacción atómica) |
| `app/globals.css` | Estilos base + `@media print` para impresión de actas |
| `app/layout.tsx` | Monta `<Toaster />` una sola vez para todo el portal |

---

## 3. Esquema de Base de Datos

### Tabla `actas`

```sql
actas (
  id                    uuid PK,
  programacion_origen_id uuid FK → programacion.id  (nullable),
  rbd                   text NOT NULL FK → establecimientos.rbd,
  sesion                integer NOT NULL CHECK > 0,
  tipo_sesion           session_type  -- 'Ordinaria' | 'Extraordinaria'
  formato               session_format -- 'Presencial' | 'Online' | 'Híbrido'
  fecha                 date NOT NULL,
  hora_inicio           time NOT NULL,
  hora_termino          time NOT NULL,
  lugar                 text NOT NULL,
  comuna                text NOT NULL,
  direccion             text NOT NULL,
  tabla_temas           text NOT NULL,
  desarrollo            text NOT NULL,
  acuerdos              text NOT NULL,
  varios                text NOT NULL,
  proxima_sesion        date,
  link_acta             text,
  asistentes            jsonb NOT NULL DEFAULT '[]'
)
```

La columna `asistentes` almacena:
```json
[{ "rol": "Director", "nombre": "…", "correo": "…", "asistio": true }]
```

### Tabla `actas_invitados`

```sql
actas_invitados (
  id       uuid PK,
  acta_id  uuid NOT NULL FK → actas.id ON DELETE CASCADE,
  nombre   text NOT NULL,
  cargo    text NOT NULL
)
```

> **Pendiente:** columna `correo` en `actas_invitados` para persistir el correo capturado en UI.

---

## 4. Vista de Lista (`app/actas/page.tsx`)

- Usa `usePortalSnapshot()` para obtener `snapshot.actas`, `snapshot.establishments` y `refresh()`.
- Muestra tarjetas en grid de 1 o 2 columnas (`xl:grid-cols-2`).
- **Búsqueda y filtro (#27):** barra de búsqueda full-text (busca en `tabla_temas`, `acuerdos`, `lugar`, `rbd`, `comuna`) + selector de tipo de sesión. El filtrado es `useMemo` sobre `rows` — sin roundtrips al servidor.
- **Acciones por tarjeta:** tres botones en cada tarjeta:
  - **"Ver"** (#29) → abre `ActaDetail` en modo solo lectura
  - **"Editar"** → abre `ActaForm` con el acta precargada
  - **"Eliminar"** (#38) → abre `ConfirmDialog` y llama `deleteActa(id)` tras confirmar
- Tras guardar o eliminar, el handler llama `refresh()` para recargar el snapshot.
- Estado de búsqueda vacía muestra mensaje diferenciado: "Sin datos" vs "Ningún acta coincide".

---

## 5. Formulario (`components/portal/acta-form.tsx`)

### 5.1 Tipo de apertura

`ActaForm` es un **drawer lateral** (`fixed inset-0 z-50`) con backdrop con blur. Se monta condicionalmente (`if (!isOpen) return null`) — no existe en el DOM cuando está cerrado.

### 5.2 Props

```ts
interface ActaFormProps {
  isOpen: boolean;
  onClose: () => void;
  establishments: Establishment[];
  actas: Acta[];          // para calcular N° de sesión
  editActa?: Acta | null; // null = modo creación
  onSaved: () => void;    // el padre llama refresh()
}
```

### 5.3 Estado interno principal

```ts
interface FormState {
  id: string | null;
  id_programacion_origen: string | null;
  rbd: string;
  nombre_establecimiento: string;
  direccion: string;
  comuna: string;
  tipo_sesion: SessionType;
  sesion: string;
  formato: SessionFormat;
  lugar: string;
  fecha: string;
  hora_inicio: string;
  hora_termino: string;
  estamentos: EstamentoState[];  // 6 estamentos fijos
  showGuests: boolean;
  guests: GuestRow[];
  tabla_temas: string;
  desarrollo: string;
  acuerdos: string;
  varios: string;
  proxima_sesion: string;
  link_acta: string;
}
```

El estado se reinicia en cada apertura (`useEffect` sobre `[isOpen, editActa]`).  
En modo **creación**, antes de reiniciar a vacío se intenta restaurar un borrador desde `localStorage` (clave `acta-draft-new`).

### 5.4 Refs internos importantes

| Ref | Propósito |
|---|---|
| `pendingFile` | Archivo PDF pendiente de upload hasta el submit |
| `initialFormRef` | Snapshot del estado al abrir, para detección de cambios sucios (#25) |
| `lastSaveTimeRef` | Timestamp del último guardado, para cooldown de 3 s (#4) |
| `draftSaveTimerRef` | Timer del debounce de escritura a localStorage (#12) |

### 5.5 Secciones del formulario

#### Sección 1 — Información de la sesión

- `<select>` de establecimiento cargado desde SLEP via `useSlepDirectorio()`.
- Al seleccionar escuela, se auto-completan y **bloquean**: `rbd`, `nombre_establecimiento`, `comuna`, `direccion`.
- **N° de sesión** siempre bloqueado. Se auto-calcula como `actas.filter(rbd+tipo).length + 1` en creación; mantiene el original en edición.
- Campos editables: tipo de sesión, formato, lugar, fecha, hora inicio, hora término.

#### Sección 2 — Asistencia estamental

| key | Label |
|---|---|
| `Director` | Director(a) |
| `Sostenedor` | Representante Sostenedor |
| `Docente` | Representante Docente |
| `Asistente` | Representante Asistente de Educación |
| `Apoderado` | Representante Apoderado |
| `Estudiante` | Representante Estudiante |

Cada uno es un `EstamentoCard` (accordion):
- Punto de color: verde = asistió, ámbar = ausente, gris = sin respuesta.
- Radio "Sí / No" → al marcar "Sí" aparece panel con nombre (required), correo, y RUT (solo Apoderado).
- RUT aplica módulo-11 chileno (`calcDv`). Error inline en rojo; no bloquea guardado.

**Quórum:** badge con `aria-label` en tiempo real. Válido desde 4/6 (`QUORUM_MIN = 4`). Solo informativo.

#### Sección 3 — Invitados externos

Toggle de visibilidad. Filas dinámicas con `crypto.randomUUID()` como clave local.  
Captura: nombre, cargo/rol, correo (UI only — correo no persiste en BD todavía).  
Se envían a `replaceActaInvitados` como `{ nombre, cargo }[]`.

#### Sección 4 — Desarrollo y acuerdos

Textareas: `tabla_temas` (req.), `desarrollo`, `acuerdos` (req.), `varios`, `proxima_sesion` (date picker).

#### Sección 5 — Evidencia documental PDF

- **Sin documento:** zona drag & drop + input oculto. Solo `application/pdf`. Queda en `pendingFile` ref.
- **Con documento:** muestra "Ver documento" + "Reemplazar".
- Barra de progreso: 50% pre-upload, 100% al confirmar URL pública.

### 5.6 Lógica de guardado

| Botón | Validación | Comportamiento |
|---|---|---|
| **Guardar avance** | Sin validación (`draft = true`) | Persiste como borrador |
| **Guardar acta final** | Valida campos obligatorios | Persiste completo |

Campos requeridos en final: `rbd`, `fecha`, `hora_inicio`, `hora_termino`, `tabla_temas`, `acuerdos`.

**Secuencia de persistencia:**
1. Verifica cooldown de 3 s desde el último guardado (#4).
2. Verifica que el RBD del formulario coincida con `profile.rbd` si el usuario es DIRECTOR (#8).
3. `upsertActa(payload)` con todos los campos sanitizados (`.trim()`) (#7) → devuelve `id`.
4. `replaceActaInvitados(id, guests)` → borra y re-inserta.
5. Si hay `pendingFile` → `uploadActaPdf(id, rbd, file, onProgress)`.
6. Registra `lastSaveTimeRef.current = Date.now()`.
7. Limpia borrador de `localStorage` si era acta nueva (#12).
8. `toast("Acta guardada correctamente.")` (#23).
9. `onSaved()` → padre llama `refresh()`.
10. `onClose()`.

Si `upsertActa` devuelve `null`: muestra banner de error, no continúa.

### 5.7 Guardia de cambios sin guardar (#25)

Al intentar cerrar el drawer (botón X, "Cancelar", o clic en el backdrop), el formulario verifica si el estado actual difiere del snapshot `initialFormRef`. Si hay diferencias, muestra `ConfirmDialog` con tone `danger` preguntando "¿Descartar cambios?". El usuario puede cancelar (volver al formulario) o confirmar (cerrar y perder cambios).

La comparación `isFormDirty` evalúa: `rbd`, `tipo_sesion`, `formato`, `lugar`, `fecha`, `hora_inicio`, `hora_termino`, `tabla_temas`, `desarrollo`, `acuerdos`, `varios`, `proxima_sesion`, asistencia de estamentos, y cantidad de invitados. **No** evalúa `expanded` (estado puramente visual de los acordeones).

### 5.8 Borrador en localStorage (#12)

- **Solo actas nuevas** (`editActa === null`).
- Clave: `acta-draft-new`.
- Escritura: debounced 800 ms tras cada cambio de `form`.
- Restauración: al abrir el drawer en modo creación, si hay un draft guardado con `id === null`, se carga en lugar del formulario vacío.
- Limpieza: se elimina del `localStorage` tras un guardado exitoso.
- Si `localStorage` no está disponible (full, bloqueado), el error se silencia.

---

## 6. Funciones de Mutación (`lib/supabase/queries.ts`)

### `upsertActa(input: ActaUpsertInput): Promise<string | null>`

- UPDATE si `input.id` existe, INSERT si no.
- Devuelve el `id` guardado, o `null` en error.
- `asistentes` se serializa a `jsonb` por Supabase.

### `replaceActaInvitados(actaId, guests): Promise<void>`

- DELETE de todas las filas con `acta_id = actaId`.
- INSERT de las nuevas. Permite cero invitados.
- **No es atómica** con `upsertActa` a nivel cliente — ver RPC `save_acta_complete` para la versión atómica.

### `uploadActaPdf(actaId, rbd, file, onProgress?): Promise<string | null>`

- Bucket: `actas`. Path: `{rbd}/{año}/{actaId}.pdf` (el `/` en RBD → `-`).
- `upsert: true` para sobrescribir versiones anteriores.
- `onProgress` recibe `50` pre-upload y `100` al confirmar (no hay progreso real por chunks en el SDK JS).
- Devuelve URL pública o `null`.

### `deleteActa(actaId: string): Promise<boolean>`

- DELETE de `actas` donde `id = actaId`.
- Los invitados se eliminan automáticamente por `ON DELETE CASCADE`.
- Devuelve `true` en éxito. No elimina el PDF en storage (pendiente).

---

## 7. RPC Atómica `save_acta_complete` (#11)

**Archivo:** `supabase/migrations/20260418_save_acta_atomic.sql`

Función PostgreSQL `SECURITY DEFINER` que ejecuta en una sola transacción:
1. Valida que un DIRECTOR no guarde un acta de otro RBD (segunda capa además de RLS).
2. UPDATE o INSERT de la fila en `actas` (con guard de RBD en el WHERE del UPDATE).
3. DELETE + INSERT en `actas_invitados`.

**Uso futuro vía cliente JS:**
```ts
const { data, error } = await supabase.rpc('save_acta_complete', {
  p_id: form.id ?? null,
  p_rbd: form.rbd,
  // ... resto de campos
  p_invitados: JSON.stringify(guests),
});
const savedId = data as string;
```

El upload de PDF **no puede ser parte** de la transacción porque Supabase Storage no comparte la transacción Postgres. La atomicidad cubre solo la parte de BD.

> **Estado:** migración creada. Para activarla ejecutar `supabase db push` o aplicarla manualmente en el dashboard de Supabase.

---

## 8. Vista de Detalle y Impresión (`components/portal/acta-detail.tsx`)

### Comportamiento (#29)

Panel lateral de solo lectura con toda la información del acta:
- Datos de sesión (fecha, horario, formato, lugar, comuna, dirección) en grid.
- Tabla completa de asistentes con badges Sí/No.
- Tabla de invitados (si existen).
- Campos de desarrollo, acuerdos y varios con `whitespace-pre-wrap`.
- Enlace al PDF si `link_acta` existe.

### Impresión (#34)

- Botón "Imprimir" llama `window.print()`.
- Clases `print:hidden` ocultan el header del panel, el backdrop y el botón.
- Se muestra un header alternativo (`hidden print:block`) con nombre del módulo y del acta.
- `globals.css` define `@media print` que oculta la navegación lateral, fuerza `background: white`, y configura `@page { size: A4; margin: 20mm }`.
- El panel usa `print:fixed print:inset-0 print:max-w-full` para ocupar toda la hoja al imprimir.

---

## 9. Sistema de Toasts (`components/ui/toast.tsx`)

**Función global:** `toast(message, tone?)` invocable desde cualquier archivo sin pasar props.  
**Tones disponibles:** `"success"` (verde), `"error"` (rojo), `"info"` (gris oscuro). Default: `"success"`.  
**Duración:** 4 s, luego desaparece automáticamente.  
**Montaje:** `<Toaster />` en `app/layout.tsx` — una instancia para todo el portal.  
**Z-index:** `z-[100]` — encima de drawers (`z-50`) y diálogos de confirmación (`z-[70]`).

```ts
// Uso desde cualquier módulo:
import { toast } from "@/components/ui/toast";
toast("Acta guardada correctamente.");
toast("Error de conexión.", "error");
```

---

## 10. Diálogo de Confirmación (`components/portal/confirm-dialog.tsx`)

Reutilizado por el formulario (guardia de cambios, #25) y por la página (eliminar acta, #38).

```ts
<ConfirmDialog
  open={boolean}
  title="¿Eliminar acta N° 03?"
  description="Esta acción no se puede deshacer."
  confirmLabel="Eliminar"
  tone="danger"         // "danger" = botón rojo | "default" = botón ocean
  onConfirm={fn}
  onCancel={fn}
/>
```

Z-index `z-[70]` — encima del drawer (`z-50`) pero por debajo del toast (`z-[100]`).

---

## 11. Hook `usePortalSnapshot` — Contexto compartido

`PortalSnapshotProvider` vive en `app-frame.tsx`. Las páginas consumen via `usePortalSnapshot()`.

```ts
const { snapshot, status, refresh } = usePortalSnapshot();
```

- Cero re-fetch al navegar entre páginas.
- `refresh()` incrementa un `refreshKey` que activa un nuevo fetch.
- La página de actas llama `refresh()` en `onSaved` y tras `deleteActa`.

---

## 12. Selector de Escuela Admin (`shell.tsx` › `SchoolSelector`)

- Solo visible para `profile.rol === "ADMIN"`.
- Carga desde SLEP via `useSlepDirectorio()`. No usa `allEstablishments`.
- Dropdown con "Todas las escuelas" (`null`) como primera opción.
- `setSelectedRbd(rbd)` filtra **todos los datos del portal** vía `fetchPortalSnapshot(selectedRbd)`.
- El DIRECTOR no ve este selector; su RBD es fijo desde `profile.rbd`.

---

## 13. Seguridad

### Capas de protección aplicadas

| Capa | Mecanismo |
|---|---|
| Base de datos | RLS en `actas` y `actas_invitados` por `rbd` del usuario autenticado |
| RPC atómica | `save_acta_complete` valida `DIRECTOR → rbd` antes de escribir |
| Cliente JS (#8) | `handleSubmit` verifica `profile.rbd === form.rbd` si `profile.rol === "DIRECTOR"` |
| Rate limit cliente (#4) | Cooldown de 3 s entre guardados vía `lastSaveTimeRef` |
| Sanitización (#7) | `.trim()` aplicado a todos los campos de texto antes de `upsertActa` |
| Render seguro | Contenidos de textareas se renderizan como texto plano en JSX — React escapa automáticamente |
| Storage | Bucket `actas`, path `{rbd}/{año}/{actaId}.pdf` — la política debe validar que el path comience con el RBD del usuario |
| MIME type | Frontend filtra `application/pdf`; validación real en servidor pendiente |

### Pendientes de seguridad

- **Política del bucket `actas`:** debe crearse explícitamente en Supabase Dashboard para permitir lectura pública de PDFs y escritura solo autenticada restringida al RBD del path.
- **Validación MIME en servidor:** el frontend filtra `application/pdf` pero un atacante puede enviar cualquier binario con ese tipo. Una Edge Function o trigger de storage debería verificar la firma mágica del archivo.
- **Migrar a RPC atómica:** reemplazar el flow de 3 pasos cliente-side por llamada a `save_acta_complete` para garantizar consistencia.

---

## 14. Invariantes — Cosas que NO deben cambiar

Estas decisiones de diseño tienen razón de ser. Cambiarlas requiere discusión explícita.

1. **N° de sesión siempre bloqueado en UI.** Se calcula del servidor (`actas.filter(rbd+tipo).length + 1`) para garantizar consistencia. Hacerlo editable abre brechas de duplicación.

2. **`asistentes` como jsonb en `actas`.** Permite guardar el estado histórico exacto del acta (nombres, correos al momento de la reunión) sin normalizar. La tabla `actas_invitados` es separada porque los invitados son variables; los 6 estamentos son fijos.

3. **`SECURITY DEFINER` en toda función helper usada dentro de políticas RLS.** Violar esto causa recursión infinita (incidente 2026-04-16). Ver sección 18 de `context.md`.

4. **Export estático de Next.js (`output: "export"`).** No hay runtime Node en producción. No usar API routes, server actions, ni dependencias de servidor para data crítica del portal.

5. **`usePortalSnapshot` como Context Provider único.** El proveedor vive en `app-frame.tsx`. Las páginas solo consumen — nunca hacen fetch propio. Esto garantiza cero re-fetch al navegar.

6. **`DataBanner` solo muestra errores reales.** Silenciado deliberadamente para estados vacíos, cargando y éxito. No revertir a mostrar mensajes de "Datos sincronizados".

7. **Drawer de formulario con `if (!isOpen) return null`.** El componente no existe en el DOM cuando está cerrado. No volver al patrón de ocultamiento con CSS (`hidden`) que sigue ocupando memoria.

8. **`useSlepDirectorio` como fuente de verdad del selector de establecimientos.** Usa el RPC `get_slep_directorio()` que lee desde `BASE DE DATOS ESCUELAS SLEP`. No reemplazar por `allEstablishments` del auth-context que viene de `establecimientos` (tabla derivada).

9. **Cooldown de 3 s entre guardados.** Previene doble-submit accidental y spam. No reducir por debajo de 2 s.

10. **Borrador en localStorage solo para actas nuevas.** Actas existentes ya están persistidas; sobrescribir el draft con datos de edición podría confundir si el usuario alterna entre nueva y edición.

---

## 15. Pendientes del Módulo

### Funcionalidad

| Pendiente | Prioridad | Notas |
|---|---|---|
| Eliminar PDF en storage al borrar acta | Alta | `deleteActa()` existe pero no llama a `supabase.storage.remove()` |
| Política del bucket `actas` | Alta | Sin política, cualquier autenticado puede escribir en cualquier path |
| Activar RPC `save_acta_complete` en cliente | Media | Migración SQL creada, falta migrar `handleSubmit` a `.rpc()` |
| Vínculo con programación (selector UI) | Media | `id_programacion_origen` existe en el estado pero sin selector |
| Columna `correo` en `actas_invitados` | Media | Capturado en UI, no persiste |
| Validación MIME en servidor para PDFs | Media | Solo se valida tipo MIME en frontend |
| Autocompletar invitados frecuentes | Baja | Query a `actas_invitados` por `rbd` de actas anteriores |

### UX/UI

| Pendiente | Notas |
|---|---|
| Progreso multi-paso en guardado | Mostrar `[1/3] Guardando acta…` → `[2/3] Invitados…` → `[3/3] PDF…` |
| Indicador "borrador restaurado" | Avisar al usuario cuando se restauró un borrador de localStorage |
| Ordenamiento del listado | Por fecha, N° sesión, o escuela |
| Estado visual borrador/final | Badge en tarjeta indicando si el acta fue guardada como final |

---

## 16. Flujo Completo de la Página de Actas

```
ActasPage monta
  ↓
usePortalSnapshot() → snapshot.actas, snapshot.establishments
  ↓
filteredRows = useMemo(rows, searchQuery, filterTipo)   ← #27
  ↓
Render grid de tarjetas filtradas
  ↓
Usuario hace clic en:
  ├── "Ver" → setViewActa(acta) → <ActaDetail> (#29)
  │     └── "Imprimir" → window.print() (#34)
  ├── "Editar" → openEdit(acta) → <ActaForm editActa={acta}>
  │     ├── Carga estado desde actaToForm()
  │     ├── Snapshot inicial en initialFormRef (#25)
  │     ├── Borrador en localStorage (solo creación) (#12)
  │     ├── Cambios dirty → ConfirmDialog al cerrar (#25)
  │     └── handleSubmit → cooldown (#4) + RBD guard (#8) + sanitize (#7)
  │           → upsertActa → replaceActaInvitados → uploadActaPdf
  │           → clearDraft → toast (#23) → refresh() → onClose()
  ├── "Eliminar" → setDeleteTarget(acta) → <ConfirmDialog> (#38)
  │     └── Confirmar → deleteActa(id) → refresh()
  └── "Nueva acta" → openNew() → <ActaForm editActa={null}>
        └── Restaura borrador de localStorage si existe (#12)
```
