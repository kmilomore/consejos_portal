# Contexto: Módulo de Actas — Consejos Escolares

> **Última actualización:** 2026-05-11 (v3)
> **Fuente de verdad local:** este archivo para el módulo de actas, complementado por `context.md` a nivel portal.
> **Estado actual:** flujo híbrido operativo con 13 mejoras UI/UX implementadas; compilación limpia.

---

## 1. Propósito

El módulo de actas cubre el flujo de registro, edición, revisión, impresión y eliminación de actas de Consejo Escolar.

Desde 2026-04-24 el módulo ya no modela una sola forma de captura. Opera con dos modalidades sobre la misma entidad `actas`:

- `ACTA_COMPLETA`: formulario estructurado con asistencia, tabla de temas, acuerdos, desarrollo y evidencia.
- `REGISTRO_DOCUMENTAL`: ingreso mínimo para sostener correlativo operativo con datos generales + documento adjunto obligatorio.

El objetivo del diseño actual es soportar la operación híbrida 2026 en las 4 comunas sin separar subsistemas ni duplicar sesiones.

---

## 2. Estado Vigente del Módulo

### Implementado y validado

- listado de actas con búsqueda, filtros y acciones
- creación y edición en drawer lateral
- detalle de solo lectura con impresión A4
- eliminación con confirmación
- soporte híbrido `ACTA_COMPLETA` / `REGISTRO_DOCUMENTAL`
- filtro visual por `modo_registro` en listado
- badges para distinguir acta completa vs documental
- métricas separadas entre completas y documentales
- horarios nullable para registros documentales
- validación RUT chileno con módulo-11 estándar
- `rut` persistido por asistente en dominio, snapshot, formulario y detalle
- nombre, RUT válido, correo y modalidad obligatorios para asistentes marcados como presentes
- borradores locales para actas nuevas y también para edición, con clave por acta
- advertencia `beforeunload` cuando el formulario tiene cambios sin guardar
- precarga del establecimiento activo al abrir `Nueva acta`
- restauración de `lib/supabase/queries.ts` como loader canónico del módulo
- corrección del guardado documental nuevo con `upsert` real sobre `actas` aun cuando el `id` se pregenere antes del upload
- rollback del archivo en Supabase Storage si el insert/update de la fila `actas` falla
- feedback visual inmediato al seleccionar documento en el modal, previo a la subida real
- `npm run build` exitoso tras restaurar el loader y dejar activo el flujo híbrido
- corrección de `validate(draft)`: "Guardar avance" en `REGISTRO_DOCUMENTAL` ahora sigue exigiendo documento adjunto, evitando el constraint `actas_registro_documental_doc_check`
- corrección del estado `uploadStatus` al rechazar archivos >50 MB: ahora se resetea a `"idle"` para no mostrar el banner de error anterior junto al nuevo mensaje de tamaño
- guard de RBD en `handleSubmit` reemplazado: ya no depende de `profile.rol === "DIRECTOR"` sino de `isGlobalAdmin + accessibleRbds`; cubre a representantes parciales con rol textual `ADMIN`
- drafts de localStorage con TTL de 24 horas: se guardan como `{ form, savedAt }` y se descartan automáticamente al expirar, acotando el tiempo que el PII de asistentes (nombre, RUT, correo) persiste en equipos compartidos
- `actas_invitados` filtrado por `acta_id` cuando hay `rbdFilter`: se construye el conjunto de IDs desde las actas del scope antes de consultar invitados, evitando traer datos de otras escuelas por red
- `humanizeDbError()` en `acta-form.tsx`: mapea errores internos de Supabase (`duplicate key`, `check constraint`, `foreign key`) a mensajes en español comprensibles para el usuario final
- banner de borrador restaurado: cuando se abre un formulario con draft previo aparece un aviso visible con botón "Descartar borrador" que limpia localStorage y resetea el estado
- `onBlur` en selector de establecimiento: si el usuario escribe texto y sale del campo sin confirmar un RBD válido, el error aparece inmediatamente sin esperar al submit
- modal de detalle (`ActaDetail`) posicionado con `items-start`: el header siempre se ve al abrir, sin importar la cantidad de datos del acta; el scroll interno sigue dentro del modal
- filtro por establecimiento en el listado de actas: visible solo para `isGlobalAdmin`; filtra `acta.rbd` en el `useMemo` junto con los demás filtros; las escuelas se cargan desde `snapshot.establishments`
- **L1** — columna "Establecimiento" en lugar de RBD: muestra nombre del establecimiento (lookup desde `snapshot.establishments`) con RBD como texto secundario; la búsqueda libre también matchea contra el nombre
- **L3** — ícono de documento adjunto en la fila: aparece `FileText` enlazado a `acta.link_acta` cuando existe; click no propaga al row para evitar abrir el detalle
- **L7** — ordenamiento de columnas por Sesión y Fecha: headers clickeables con indicador de flecha; estado `sortField` + `sortDir` dentro del mismo `useMemo` de `filteredRows`; default Fecha desc
- **L4** — navegación prev/next dentro del modal de detalle: `filteredRows` y `onNavigate` se pasan desde la página; el modal muestra chevrons que navegan por la lista filtrada actual
- **D1** — resumen de quórum en el header del modal: badge `X/Y · Quórum válido/Sin quórum` visible solo para `ACTA_COMPLETA`; umbral mínimo 4 de 6
- **D2** — banner de próxima sesión al inicio del body del modal: aparece si `acta.proxima_sesion` existe; reemplaza la row inline que estaba al final del detalle
- **D3** — botón "Copiar enlace" en el header del modal: copia `?acta=<id>` al portapapeles; muestra "Copiado" 2 s y vuelve al estado original
- **F1** — indicador visible de autoguardado en el footer del formulario: "Borrador guardado hace X min" aparece junto al botón Cancelar después de cada persistencia en localStorage; calculado con `timeAgo()`
- **F4** — botones "Expandir todos" / "Colapsar todos" en la sección de asistencia: modifica `expanded` en todos los `EstamentoState` del array de forma inmutable
- **F5** — barra de progreso por pasos en el header del formulario: indicadores numerados (Sesión → Asistencia → Contenido → Evidencia para acta completa; Sesión → Documento para documental); paso completado se pinta en `ocean`
- **F7** — vista previa del archivo seleccionado: card con nombre, tamaño formateado (`formatBytes`) y sub-tipo MIME; aparece debajo del dropzone cuando hay `pendingFile`
- **F8** — autocompletado de datos del asistente desde actas previas: el campo "Nombre completo" de cada `EstamentoCard` usa `<datalist>` con nombres históricos del mismo RBD y rol; al seleccionar una sugerencia se auto-rellenan RUT y correo
- **F11** — `QuorumBadge` sticky al hacer scroll en el formulario: la cabecera de la sección de asistencia tiene `sticky top-0 z-10 bg-white/95 backdrop-blur-sm`; incluye además los botones Expandir/Colapsar

### Pendiente o parcial

- activación del RPC `save_acta_complete` en cliente
- eliminación del PDF en Storage al borrar acta
- validación en entorno real de la migración `20260505_consejos_storage_evidencias_50mb.sql`
- validación MIME real del archivo en servidor
- persistencia de correo de invitados en BD
- selector UI para `programacion_origen_id`
- definición final de KPIs que cuentan solo `ACTA_COMPLETA` vs ambos modos
- confirmación en entorno real de que `20260424_consejos_representante_scope.sql` está aplicada; sin esa migración el alcance por comuna/escuela/representante no queda garantizado

---

## 3. Rutas y Archivos que Mandan

### Rutas principales

| Ruta | Rol |
|---|---|
| `/actas/` | listado, filtros, apertura de formulario, detalle y eliminación |
| `/metricas/` | lectura agregada incluyendo separación por `modo_registro` |

### Archivos clave del flujo

| Archivo | Rol real hoy |
|---|---|
| `app/actas/page.tsx` | listado tabular, búsqueda, filtros `tipo` y `modo`, acciones editar/eliminar, apertura de detalle |
| `components/portal/acta-form.tsx` | formulario principal de creación/edición, con bifurcación entre modo completo y documental |
| `components/portal/acta-detail.tsx` | vista de solo lectura, impresión y adaptación visual según `modo_registro` |
| `components/portal/confirm-dialog.tsx` | confirmar descarte de cambios y eliminación |
| `components/ui/toast.tsx` | feedback de guardado o error |
| `lib/supabase/queries.ts` | loader canónico y mutaciones del módulo |
| `lib/supabase/use-portal-snapshot.tsx` | snapshot compartido; fuente única de datos para la página |
| `lib/supabase/auth-context.tsx` | `profile`, `selectedRbd`, `establishment`, alcance de la escuela activa |
| `lib/supabase/use-slep-directorio.ts` | filtrado visible del directorio para representantes y cobertura parcial |
| `lib/supabase/use-slep-directorio.ts` | catálogo visible de escuelas para el selector |
| `types/domain.ts` | `Acta`, `AttendeeSlot`, `InvitedGuest`, `ActaRecordMode` |
| `supabase/migrations/20260418_save_acta_atomic.sql` | RPC atómica alineada al modo híbrido, aún no activada en cliente |
| `supabase/migrations/20260424_consejos_actas_registro_documental.sql` | migración que habilita `modo_registro`, `observacion_documental` y horarios nullable |
| `supabase/migrations/20260505_consejos_storage_evidencias_50mb.sql` | sube el límite del bucket `evidencias_actas` a 50 MB para alinearlo con la UI |

### Orden recomendado para investigar un problema

1. `components/portal/acta-form.tsx`
2. `app/actas/page.tsx`
3. `components/portal/acta-detail.tsx`
4. `lib/supabase/queries.ts`
5. `lib/supabase/use-portal-snapshot.tsx`
6. migraciones SQL del módulo

---

## 4. Modelo de Datos Vigente

### Tipo de dominio relevante

```ts
type ActaRecordMode = "ACTA_COMPLETA" | "REGISTRO_DOCUMENTAL"
```

### Tabla `actas` en su forma operativa actual

Campos relevantes del módulo:

```sql
actas (
  id                     uuid primary key,
  programacion_origen_id uuid null,
  rbd                    text not null,
  sesion                 integer not null,
  modo_registro          text not null default 'ACTA_COMPLETA',
  tipo_sesion            session_type not null,
  formato                session_format not null,
  fecha                  date not null,
  hora_inicio            time null,
  hora_termino           time null,
  lugar                  text not null,
  comuna                 text not null,
  direccion              text not null,
  tabla_temas            text not null,
  desarrollo             text not null,
  acuerdos               text not null,
  varios                 text not null,
  observacion_documental text not null default '',
  proxima_sesion         date null,
  link_acta              text null,
  asistentes             jsonb not null default '[]'
)
```

### Reglas estructurales actuales

- `ACTA_COMPLETA` y `REGISTRO_DOCUMENTAL` viven en la misma tabla.
- ambas modalidades comparten correlativo por `rbd + tipo_sesion`.
- `REGISTRO_DOCUMENTAL` debe tener `link_acta`.
- `REGISTRO_DOCUMENTAL` puede omitir horario detallado y contenido estructurado.
- los asistentes ahora pueden incluir `rut` además de `nombre`, `correo`, `asistio` y `modalidad`.

### Tabla `actas_invitados`

```sql
actas_invitados (
  id       uuid primary key,
  acta_id  uuid not null references actas(id) on delete cascade,
  nombre   text not null,
  cargo    text not null
)
```

Observación vigente:

- el formulario sigue capturando correo de invitados, pero ese dato todavía no persiste en BD.

---

## 5. Flujos Reales del Módulo

### Flujo A — Abrir listado y filtrar

Fuente:
- `usePortalSnapshot()` en `app/actas/page.tsx`

Comportamiento actual:
- usa `snapshot.actas` y `snapshot.establishments`
- filtra por texto libre sobre `tabla_temas`, `acuerdos`, `observacion_documental`, `lugar`, `rbd`, `comuna` y nombre del establecimiento (via `establishmentMap`)
- filtra además por `tipo_sesion`
- filtra además por `modo_registro`
- filtra además por `rbd` cuando `isGlobalAdmin === true` y el usuario selecciona una escuela (filtro visible solo para admins globales)
- ordena por `sortField` (`"fecha"` o `"sesion"`) con dirección `sortDir` (`"asc"` | `"desc"`); default: Fecha desc
- muestra badge `Completa` o `Documental` por fila
- muestra el nombre del establecimiento en lugar del RBD en la columna de escuela (RBD como texto secundario)
- muestra ícono de documento cuando `acta.link_acta` existe
- el horario renderiza tolerando `null`
- todos los filtros y el ordenamiento corren en el mismo `useMemo`; `sortField`, `sortDir` y `establishmentMap` están en las dependencias

Hallazgo importante:

- el listado ya no es solo un buscador de actas completas; también funciona como panel de seguimiento de la transición documental.

### Flujo B — Nueva acta

Entrada:
- botón `Nueva acta`

Comportamiento actual:
- si existe `selectedRbd` o escuela activa en contexto, precarga `rbd`, nombre, dirección y comuna
- recalcula `sesion` automáticamente según `rbd + tipo_sesion`
- restaura borrador local si existe una clave de draft para nueva acta
- el usuario decide si está creando una `ACTA_COMPLETA` o un `REGISTRO_DOCUMENTAL`

### Flujo C — Editar acta existente

Entrada:
- botón `Editar` en el listado

Comportamiento actual:
- `actaToForm()` lleva los datos a `FormState`
- si existe draft local para esa acta, se prioriza ese draft por sobre la data persistida
- el borrador queda aislado por `id` de acta, no comparte clave con creación

### Flujo D — Guardar acta completa

Validaciones obligatorias:
- `rbd`
- `fecha`
- `hora_inicio`
- `hora_termino`
- `tabla_temas`
- `acuerdos`
- para todo estamento con `asistio === true`: nombre, RUT válido, correo válido y modalidad

Persistencia:
Persistencia:
1. cooldown cliente de 3 s
2. guard de `DIRECTOR -> rbd`
3. `upsertActa(...)`
4. `replaceActaInvitados(...)`
5. `uploadActaDocument(...)` si hay archivo pendiente
6. `updateActaLink(...)` si el upload devuelve URL
7. limpieza del draft local
8. `toast(...)`
9. `refresh()` desde el padre

### Flujo E — Guardar registro documental

Validaciones obligatorias:
- `rbd`
- `fecha`
- `link_acta` o archivo pendiente

Comportamiento diferencial:
- no exige horario completo
- no exige tabla de temas ni acuerdos
- no guarda asistentes
- no guarda invitados
- usa `observacion_documental` como nota breve de contexto
- sube el archivo de respaldo a Supabase Storage antes de insertar la fila cuando es un documental nuevo
- si la persistencia en `actas` falla, intenta borrar el archivo recién subido para evitar huérfanos en Storage
- el insert/update de la fila usa `upsert` real por `id`, evitando el bug en que un documental nuevo se trataba como `update` y nunca se insertaba
- el botón final cambia texto a `Guardar registro documental`
  - **"Guardar avance" también exige documento**: `validate(draft=true)` verifica si el modo es `REGISTRO_DOCUMENTAL` y no hay `link_acta` ni archivo pendiente; si falta, bloquea el guardado antes de llegar a Supabase (necesario porque el constraint de BD es incondicional)
Disparadores:
- botón cerrar
- botón cancelar
- click en backdrop
- navegación fuera de la página o recarga del navegador

Comportamiento:
- `isFormDirty(...)` compara el estado actual con el snapshot inicial
- si hay cambios, abre `ConfirmDialog`
- además se registra `beforeunload` para proteger salidas duras del navegador

### Flujo G — Ver detalle e imprimir

Comportamiento actual:
- `ActaDetail` detecta `modo_registro`
- si es documental, prioriza bloque de observación documental
- si es completa, muestra asistencia, invitados, acuerdos y desarrollo; incluye badge de quórum en el header
- la tabla de asistentes incluye columna `RUT`
- si `acta.proxima_sesion` existe, aparece un banner destacado al inicio del body (reemplaza la row inline al final)
- botón "Copiar enlace" copia `?acta=<id>` al portapapeles directamente desde el header
- navegación prev/next por la lista filtrada actual mediante chevrons en el header; flechas deshabilitadas en los extremos
- el header muestra nombre del establecimiento (`escuela?.nombre ?? acta.rbd`) junto al RBD
- impresión usa `window.print()` y layout A4
- `siblingActas` y `onNavigate` provienen de `app/actas/page.tsx`; si no se pasan, los chevrons no se muestran

### Flujo H — Eliminar acta

Comportamiento actual:
- usa `ConfirmDialog`
- ejecuta `deleteActa(id)`
- refresca snapshot

Pendiente:
- no elimina aún el archivo del bucket `evidencias_actas`

---

## 6. Snapshot, Queries y Dependencias Críticas

### `usePortalSnapshot()` es la única fuente de datos de la página

No hacer fetch propio desde `app/actas/page.tsx`.

Razón:
- el portal está diseñado para consumir un snapshot único compartido
- reintroducir `useEffect` locales rompe consistencia y multiplica estados de carga

### `lib/supabase/queries.ts` es el punto canónico

Responsabilidades actuales:
- `fetchPortalSnapshot(rbdFilter?)`
- `upsertActa(...)`
- `replaceActaInvitados(...)`
- `uploadActaPdf(...)`
- `updateActaLink(...)`
- `deleteActa(...)`

Normalizaciones actuales del loader:
- normaliza `modo_registro`
- reconstruye invitados desde `actas_invitados`
- normaliza asistentes incluyendo `rut`
- acepta `hora_inicio` y `hora_termino` como `null`
- expone `actasByMode`

Hallazgo crítico del sprint:
- este archivo fue contaminado por una implementación externa incorrecta y tuvo que ser restaurado
- hoy está nuevamente alineado al repo y al import correcto `@/lib/supabase/client`

No tocar sin revisar primero:
- imports base del cliente Supabase
- shape de `PortalSnapshot`
- compatibilidad con `modo_registro`, `observacion_documental`, `rut`, `actasByMode`

---

## 7. Hallazgos y Aciertos del Módulo

### Hallazgos confirmados

- el validador anterior de RUT era demasiado frágil y marcaba como inválidos RUT reales
- el borrador limitado solo a nuevas actas era insuficiente para operación real; la edición también necesita recuperación local
- el ingreso documental requiere existir como modalidad explícita, no como “acta incompleta” informal
- separar métricas por modo evita leer como avance real lo que todavía es solo respaldo documental
- `queries.ts` es dependencia de primer orden: si se rompe, la validación del resto del módulo se vuelve engañosa
- el flujo documental nuevo tenía un bug real: al pre-generar `id`, la mutación trataba el guardado como `update` y dejaba archivos en Storage sin fila en `actas`
- el nombre del bucket debía alinearse con SQL (`evidencias_actas`) y no con el alias histórico `actas`
- el scope territorial no depende del texto del rol por sí solo; representantes pueden persistirse con rol textual `ADMIN`, pero el alcance efectivo lo define `isGlobalAdmin()` + `has_school_scope_access(...)`
- cualquier pantalla que use `profile.rol === 'ADMIN'` como sinónimo de acceso global introduce riesgo de mostrar más contexto del debido
- `validate(draft=true)` no puede ser un `return true` incondicional: el constraint `actas_registro_documental_doc_check` se aplica en BD independientemente del modo de guardado; si el draft omite la validación de documento, la fila se inserta con `link_acta: null` y la BD la rechaza con un error 400 opaco
- rechazar un archivo por tamaño no basta con mostrar el error de campo; hay que resetear `uploadStatus` a `"idle"` o el banner de upload-error anterior sigue visible en pantalla
- el guard textual `profile.rol === "DIRECTOR"` no era suficiente: representantes con rol `ADMIN` pero scope parcial podían guardar actas fuera de su cobertura en client-side; el guard vigente usa `isGlobalAdmin + accessibleRbds`
- drafts sin TTL en localStorage son un riesgo de PII en equipos compartidos; la clave `savedAt` permite expirarlos a las 24 horas sin depender de eventos de sesión
- la query de `actas_invitados` sin filtrar por `acta_id` trae datos de todas las escuelas por red aunque RLS los descarte después en JS; al filtrar en la query se evita la fuga por transporte
- los mensajes de error crudos de Supabase (en inglés y con nombres de constraints) llegan al usuario si no se interceptan; `humanizeDbError` es el punto canónico de traducción
- mostrar solo el RBD en la columna de escuela obliga al usuario a memorizar códigos; el nombre del establecimiento desde `snapshot.establishments` aporta contexto sin red adicional
- el ordenamiento de columnas que no resetea el índice del modal abierto introduce inconsistencia: el nav prev/next usa `filteredRows` en tiempo de render del modal, lo que es siempre coherente con la lista actual
- la sugerencia de asistentes desde `actas` previas no debe cruzar RBDs: `getAttendeesSuggestions` filtra `a.rbd === rbd` antes de extraer nombres; sin este filtro se expondría PII de otras escuelas

### Aciertos del diseño actual

- mantener un solo modelo `actas` evita duplicar sesiones y correlativos
- el modo documental permite operar ya sin esperar digitalización total del histórico
- el snapshot compartido simplifica refrescos y consistencia del listado
- la precarga por escuela activa reduce errores de RBD en creación
- endurecer asistentes presentes mejora trazabilidad sin complicar el caso documental
- separar `isGlobalAdmin` del rol textual permite sostener representantes del sostenedor con navegación tipo admin pero alcance parcial real
- el guard de RBD basado en `accessibleRbds` es agnóstico al rol textual: funciona igual para `DIRECTOR`, `ADMIN` parcial y cualquier rol futuro sin cambios en client-side
- el banner de borrador restaurado elimina la ambigüedad de si el formulario viene de un draft o de cero, y ofrece salida explícita al usuario
- el `onBlur` en el selector de establecimiento adelanta el error al momento de perder foco, antes del submit, reduciendo ciclos de corrección
- el indicador de pasos en el header del formulario convierte el progreso en algo visible sin agregar navegación por pestañas ni romper el flujo de scroll único
- el sticky del header de asistencia resuelve el problema de perder el quórum de vista mientras se rellenan los 6 estamentos; sin esto el badge desaparecía al hacer scroll
- el autocompletado de asistentes basado en actas previas reduce el tiempo de ingreso repetitivo para establecimientos con consejo estable; no reemplaza la validación de campos
- pasar `siblingActas` desde la página al modal es la forma correcta de compartir la lista filtrada sin que el modal tenga acceso directo al snapshot
- `timeAgo` como cadena local en el indicador de autoguardado es suficiente para feedback operativo; no requiere internacionalización ni timestamps exactos
- el separador `· RBD` en el header del modal de detalle permite identificar el establecimiento por nombre y verificar el código sin buscar otra columna

---

## 8. Problemas, Riesgos y Fragilidades Actuales

- si no está aplicada `20260424_consejos_actas_registro_documental.sql`, el frontend híbrido queda desalineado con la base
- si no está aplicada `20260424_consejos_representante_scope.sql`, los representantes pueden terminar viendo un comportamiento incoherente con la cobertura esperada
- si no está aplicada `20260505_consejos_storage_evidencias_50mb.sql`, la UI puede aceptar hasta 50 MB pero Supabase Storage seguirá rechazando archivos sobre 10 MB
- si se rompe `queries.ts`, el módulo puede compilar pero cargar semántica equivocada
- el flujo cliente-side todavía no es transaccional entre acta e invitados
- el documento adjunto sigue fuera de la transacción SQL
- el bucket real del módulo es `evidencias_actas`; `link_acta` depende de que el bucket exista con acceso público compatible con `getPublicUrl()`
- el bucket/documento puede quedar huérfano si falla también el rollback de Storage después de un error de BD o si hubo intentos anteriores al parche
- el correo de invitados se pierde porque no existe columna persistente
- cualquier KPI nuevo puede inducir error si no aclara si cuenta solo completas o ambas modalidades
- un archivo rechazado por tamaño máximo debe también resetear `uploadStatus`; de lo contrario el banner de error previo convive con el nuevo mensaje de validación

- el límite vigente de carga para documentos de acta es 50 MB y debe mantenerse alineado entre UI y bucket `evidencias_actas`
- el texto del perfil en `usuarios_perfiles.rol` no basta para inferir alcance: hoy el verdadero permiso global está en `is_global_admin()` y el scope territorial en `current_accessible_rbds()`
- si se añade un rol nuevo que no sea `DIRECTOR` ni `ADMIN` pero tenga scope parcial, el guard `isGlobalAdmin + accessibleRbds` lo cubre automáticamente siempre que `get_current_portal_scope()` devuelva sus RBDs correctamente
- drafts creados antes de 2026-05-11 están en formato `FormState` plano (sin `savedAt`); `parseSavedDraft` los descarta automáticamente al no encontrar `savedAt` — ningún dato queda huérfano
- `getAttendeesSuggestions` depende de que `actas` tenga datos de asistentes del mismo RBD; si el usuario crea su primer acta para un establecimiento, no habrá sugerencias — el campo funciona igual sin datalist
- el nav prev/next del modal navega por `filteredRows` en el momento del render; si el usuario cambia un filtro con el modal abierto y la acta ya no está en la lista filtrada, `currentIndex` será `-1` y los botones quedarán deshabilitados sin cerrar el modal automáticamente
- el sticky del header de asistencia con `backdrop-blur-sm` puede generar artefactos visuales en Safari si el contenedor scrollable no tiene `overflow-y-auto` explícito; no remover esa propiedad del body del formulario
- `navigator.clipboard.writeText` requiere contexto seguro (HTTPS); en entornos locales sin SSL el botón "Copiar enlace" puede fallar silenciosamente — el `try/catch` no está implementado, el error se propagará a la consola

---

## 9. Cosas que No Debe Hacer ni Tocar una Mejora Nueva

### No debe hacer

1. No crear un subsistema separado para `REGISTRO_DOCUMENTAL`.
2. No duplicar la sesión para “convertir” documental en completa; la evolución debe ocurrir sobre la misma acta.
3. No volver a cargar datos del módulo con `useEffect` locales en la página.
4. No asumir que toda acta tiene `hora_inicio` y `hora_termino`.
5. No asumir que toda acta tiene asistencia o invitados.
6. No contar automáticamente documentales como avance equivalente a acta completa en nuevas métricas.
7. No confiar en imports `@/utils/supabase/client`; en este repo el import correcto es `@/lib/supabase/client`.
8. No volver al borrador único `acta-draft-new` para todos los casos; hoy el draft es por acta.
9. No relajar la obligación de RUT/correo/modalidad para asistentes presentes sin rediseño explícito.
10. No volver a tratar `profile.rol === 'ADMIN'` como equivalente a “admin global” sin revisar también `isGlobalAdmin`.
11. No usar `if (draft) return true` como atajo total en `validate()`: las reglas que son constraints de BD deben aplicarse siempre, incluso para “Guardar avance”.
12. No restaurar el guard textual `profile.rol === “DIRECTOR”` en `handleSubmit`; el guard vigente usa `isGlobalAdmin + accessibleRbds` y cubre todos los roles con scope parcial.
13. No guardar en localStorage el `FormState` plano sin `savedAt`; el formato esperado por `parseSavedDraft` es `{ form: FormState, savedAt: number }`.
14. No exponer mensajes de error de Supabase directamente en `setSaveError`; usar `humanizeDbError()` o redactar un mensaje propio en español.
15. No volver a `items-center` en el contenedor de `ActaDetail`; el modal debe anclar desde arriba del viewport (`items-start`) para que el header sea inmediatamente visible.
16. No mostrar el filtro de establecimiento a usuarios no globales; la condición `isGlobalAdmin` en `app/actas/page.tsx` es deliberada y no debe relajarse a `canSelectSchool` sin validar el contrato de scope.
17. No usar `sortField` y `sortDir` fuera del `useMemo` de `filteredRows`; el orden es presentación pura y no debe afectar el estado del modal abierto ni el conteo de resultados.
18. No implementar `getAttendeesSuggestions` con acceso a todos los RBDs del snapshot; la función filtra `a.rbd === rbd` obligatoriamente para no sugerir PII de otras escuelas.
19. No llamar `navigator.clipboard.writeText` sin considerar que puede lanzar en entornos sin HTTPS; agregar `try/catch` si se reutiliza el patrón de copiado en otros lugares.
20. No sacar el `QuorumBadge` del wrapper sticky sin moverlo a otro contexto visible; si se mueve al body scrollable el usuario pierde referencia de quórum mientras rellena los 6 estamentos.

### No tocar sin revisar también

- `types/domain.ts`
- `lib/supabase/queries.ts`
- `supabase/migrations/20260424_consejos_actas_registro_documental.sql`
- `supabase/migrations/20260418_save_acta_atomic.sql`
- `supabase/migrations/20260505_consejos_storage_evidencias_50mb.sql`
- `lib/supabase/use-portal-snapshot.tsx`
- `components/portal/acta-detail.tsx` — posicionamiento del modal, layout A4, navegación prev/next, banner D2 y botón D3
- `app/actas/page.tsx` — filtros, ordenamiento y condición `isGlobalAdmin` para filtro de escuela; `establishmentMap`; props pasados a `ActaDetail`
- `components/portal/acta-form.tsx` — header de progreso F5, sticky header de asistencia F11, `getAttendeesSuggestions`, `formatBytes`, `timeAgo`

Razón:
- los primeros forman el contrato del módulo entre UI, snapshot y BD
- `acta-detail.tsx` tiene clases `print:*` que definen el layout de impresión; cambios de layout pueden romper la vista A4; la navegación prev/next depende de que `siblingActas` se pase desde la página
- `page.tsx` concentra todos los filtros del listado en un único `useMemo`; agregar estado fuera de ese memo rompe la consistencia del conteo y del nav modal
- el sticky header de `acta-form.tsx` requiere que el body del formulario mantenga `overflow-y-auto`; removerlo rompe tanto el scroll interno como el `backdrop-blur`

---

## 10. Invariantes del Módulo

1. El número de sesión sigue bloqueado en UI.
2. El correlativo se calcula por `rbd + tipo_sesion`.
3. `ACTA_COMPLETA` y `REGISTRO_DOCUMENTAL` comparten la misma tabla `actas`.
4. `REGISTRO_DOCUMENTAL` debe tener `link_acta`.
5. `usePortalSnapshot()` sigue siendo la única fuente de datos de la página.
6. `ActaForm` sigue montándose condicionalmente con `if (!isOpen) return null`.
7. `DataBanner` solo debe mostrar errores reales.
8. `queries.ts` sigue siendo el loader y mutador canónico del módulo.
9. los asistentes presentes requieren trazabilidad mínima: nombre, RUT, correo, modalidad.
10. la operación híbrida debe seguir funcionando para las 4 comunas sin flags separados en frontend.
11. el representante del sostenedor puede navegar con perfil tipo admin, pero su visibilidad efectiva debe seguir limitada por RBD/comuna autorizados en Supabase.
12. `validate(draft)` debe proteger todas las reglas que son invariantes de BD aunque el guardado sea parcial.
13. el guard de RBD en `handleSubmit` usa `isGlobalAdmin + accessibleRbds`, no el rol textual; no reemplazar.
14. los drafts en localStorage tienen formato `{ form, savedAt }` y TTL de 24 horas; `parseSavedDraft` es la única función que los lee.
15. los errores de Supabase que llegan al usuario pasan por `humanizeDbError()`; no exponer mensajes crudos del cliente.
16. `ActaDetail` ancla desde `items-start` del viewport; el scroll interno queda en el body del modal, no en el documento.
17. el filtro por establecimiento en el listado es exclusivo de `isGlobalAdmin`; el estado `filterRbd` forma parte del `useMemo` de `filteredRows`.
18. el ordenamiento de columnas (`sortField`, `sortDir`) se aplica dentro del mismo `useMemo` de `filteredRows`, después del filtrado; no se maneja en estado separado.
19. `siblingActas` y `onNavigate` se pasan desde `app/actas/page.tsx` a `ActaDetail`; el modal no accede al snapshot directamente.
20. `getAttendeesSuggestions` filtra siempre por `rbd` antes de devolver nombres; no devuelve sugerencias de otras escuelas.
21. el indicador de autoguardado (`lastDraftSavedAt`) solo se actualiza al persistir en localStorage, no al detectar cambios en el formulario.
22. el header de asistencia usa `sticky top-0` dentro del body con `overflow-y-auto`; depende de esa propiedad en el contenedor padre para funcionar correctamente.

---

## 11. Checklist para Tocar este Módulo

Antes de editar:

1. Revisar `context.md` y este archivo.
2. Verificar si están aplicadas `20260424_consejos_storage_evidencias_public_any_file.sql` y `20260505_consejos_storage_evidencias_50mb.sql` cuando haya cambios de storage, tipos de archivo o tamaño máximo.
3. Verificar si está aplicada `20260424_consejos_representante_scope.sql` antes de concluir que un problema de visibilidad es “solo frontend”.
2. Confirmar si el cambio afecta `ACTA_COMPLETA`, `REGISTRO_DOCUMENTAL` o ambos.
3. Verificar si toca contrato de dominio, snapshot o migración.

Si tocas formulario:

1. revisar `components/portal/acta-form.tsx`
2. validar `isFormDirty(...)`
3. validar drafts por acta
4. validar asistentes presentes

Si tocas persistencia:

1. revisar `lib/supabase/queries.ts`
2. revisar migraciones SQL relacionadas
3. confirmar compatibilidad con `fetchPortalSnapshot()`

Si tocas métricas o listado:

1. revisar `app/actas/page.tsx`
2. revisar `app/metricas/page.tsx`
3. decidir explícitamente cómo cuenta `REGISTRO_DOCUMENTAL`

Validación mínima esperada:

1. `npm run build`
2. prueba manual de nueva acta completa
3. prueba manual de nuevo registro documental
4. prueba manual de edición con draft restaurable

---

## 12. Flujo Resumido del Módulo

```text
ActasPage monta
  -> usePortalSnapshot()
  -> rows = snapshot.actas
  -> establishmentMap = Map<rbd, nombre> desde snapshot.establishments
  -> filtro por texto (incluye nombre escuela) + tipo + modo + rbd (rbd solo visible si isGlobalAdmin)
  -> ordena por sortField/sortDir en el mismo useMemo → filteredRows
  -> columna Establecimiento muestra nombre + RBD secundario
  -> ícono de documento en fila si acta.link_acta existe
  -> headers Sesión y Fecha clickeables para ordenar

Usuario abre nueva acta
  -> ActaForm precarga escuela activa si existe
  -> restaura draft local por clave (si existe y tiene < 24h)
  -> muestra banner de borrador restaurado si corresponde
  -> header muestra pasos de progreso (F5): Sesión → Asistencia → Contenido → Evidencia
  -> elige ACTA_COMPLETA o REGISTRO_DOCUMENTAL

Mientras rellena formulario
  -> borrador se guarda cada 800ms; footer muestra "Borrador guardado hace X min" (F1)
  -> sección asistencia con sticky header + Expandir/Colapsar todos + QuorumBadge (F4, F11)
  -> nombres de asistentes sugieren desde actas previas del mismo RBD/rol (F8)
  -> al seleccionar archivo, aparece preview con nombre, tamaño y tipo MIME (F7)

Si guarda ACTA_COMPLETA
  -> valida fecha, horas, temas, acuerdos y asistentes presentes
  -> guard: !isGlobalAdmin && !accessibleRbds.includes(form.rbd) → bloquea
  -> upsertActa → replaceActaInvitados → uploadActaPdf / updateActaLink si aplica
  -> limpia draft → toast → refresh

Si guarda REGISTRO_DOCUMENTAL
  -> valida fecha + documento
  -> guard: !isGlobalAdmin && !accessibleRbds.includes(form.rbd) → bloquea
  -> upsertActa sin asistentes ni invitados → uploadActaPdf / updateActaLink si aplica
  -> limpia draft → toast específico → refresh

Usuario ve detalle
  -> ActaDetail monta anclado arriba del viewport (items-start)
  -> si proxima_sesion existe: banner destacado al inicio del body (D2)
  -> header muestra nombre establecimiento + RBD, badge de quórum para ACTA_COMPLETA (D1)
  -> botón "Copiar enlace" copia ?acta=<id> al portapapeles (D3)
  -> chevrons prev/next navegan por filteredRows pasado desde la página (L4)
  -> adapta la lectura según modo_registro
  -> scroll interno dentro del modal, no del documento

Usuario elimina
  -> ConfirmDialog → deleteActa → refresh
```

---

## 13. Nota Final para Futuras Iteraciones

La tentación más peligrosa en este módulo es tratar `REGISTRO_DOCUMENTAL` como una excepción temporal sin contrato propio. Eso ya no es cierto. Hoy el modo documental es parte explícita del modelo, del snapshot, de las métricas, del formulario y de la migración.

Si una mejora nueva no parte desde esa realidad, es muy probable que rompa compatibilidad entre UI, dominio, SQL y lectura operativa.
