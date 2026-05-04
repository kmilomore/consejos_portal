# Contexto: Módulo de Actas — Consejos Escolares

> **Última actualización:** 2026-05-04
> **Fuente de verdad local:** este archivo para el módulo de actas, complementado por `context.md` a nivel portal.
> **Estado actual:** flujo híbrido operativo, compilando correctamente y con hallazgos recientes en permisos/scope territorial.

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
- corrección del estado `uploadStatus` al rechazar archivos >10 MB: ahora se resetea a `"idle"` para no mostrar el banner de error anterior junto al nuevo mensaje de tamaño

### Pendiente o parcial

- activación del RPC `save_acta_complete` en cliente
- eliminación del PDF en Storage al borrar acta
- validación en entorno real de la migración `20260424_consejos_storage_evidencias_public_any_file.sql`
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
- filtra por texto libre sobre `tabla_temas`, `acuerdos`, `observacion_documental`, `lugar`, `rbd`, `comuna`
- filtra además por `tipo_sesion`
- filtra además por `modo_registro`
- muestra badge `Completa` o `Documental` por fila
- el horario renderiza tolerando `null`

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
- si es completa, muestra asistencia, invitados, acuerdos y desarrollo
- la tabla de asistentes incluye columna `RUT`
- impresión usa `window.print()` y layout A4

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

### Aciertos del diseño actual

- mantener un solo modelo `actas` evita duplicar sesiones y correlativos
- el modo documental permite operar ya sin esperar digitalización total del histórico
- el snapshot compartido simplifica refrescos y consistencia del listado
- la precarga por escuela activa reduce errores de RBD en creación
- endurecer asistentes presentes mejora trazabilidad sin complicar el caso documental
- separar `isGlobalAdmin` del rol textual permite sostener representantes del sostenedor con navegación tipo admin pero alcance parcial real

---

## 8. Problemas, Riesgos y Fragilidades Actuales

- si no está aplicada `20260424_consejos_actas_registro_documental.sql`, el frontend híbrido queda desalineado con la base
- si no está aplicada `20260424_consejos_representante_scope.sql`, los representantes pueden terminar viendo un comportamiento incoherente con la cobertura esperada
- si se rompe `queries.ts`, el módulo puede compilar pero cargar semántica equivocada
- el flujo cliente-side todavía no es transaccional entre acta e invitados
- el documento adjunto sigue fuera de la transacción SQL
- el bucket real del módulo es `evidencias_actas`; `link_acta` depende de que el bucket exista con acceso público compatible con `getPublicUrl()`
- el bucket/documento puede quedar huérfano si falla también el rollback de Storage después de un error de BD o si hubo intentos anteriores al parche
- el correo de invitados se pierde porque no existe columna persistente
- cualquier KPI nuevo puede inducir error si no aclara si cuenta solo completas o ambas modalidades
- un archivo rechazado por tamaño máximo debe también resetear `uploadStatus`; de lo contrario el banner de error previo convive con el nuevo mensaje de validación
- el texto del perfil en `usuarios_perfiles.rol` no basta para inferir alcance: hoy el verdadero permiso global está en `is_global_admin()` y el scope territorial en `current_accessible_rbds()`

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
10. No volver a tratar `profile.rol === 'ADMIN'` como equivalente a “admin global” sin revisar también `isGlobalAdmin`.11. No usar `if (draft) return true` como atajo total en `validate()`: las reglas que son constraints de BD deben aplicarse siempre, incluso para "Guardar avance".
### No tocar sin revisar también

- `types/domain.ts`
- `lib/supabase/queries.ts`
- `supabase/migrations/20260424_consejos_actas_registro_documental.sql`
- `supabase/migrations/20260418_save_acta_atomic.sql`
- `lib/supabase/use-portal-snapshot.tsx`

Razón:
- estos archivos forman el contrato del módulo entre UI, snapshot y BD

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

---

## 11. Checklist para Tocar este Módulo

Antes de editar:

1. Revisar `context.md` y este archivo.
2. Verificar si está aplicada `20260424_consejos_storage_evidencias_public_any_file.sql` cuando haya cambios de storage o tipos de archivo.
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
  -> filtro por texto + tipo + modo

Usuario abre nueva acta
  -> ActaForm precarga escuela activa si existe
  -> restaura draft local por clave
  -> elige ACTA_COMPLETA o REGISTRO_DOCUMENTAL

Si guarda ACTA_COMPLETA
  -> valida fecha, horas, temas, acuerdos y asistentes presentes
  -> upsertActa
  -> replaceActaInvitados
  -> uploadActaPdf / updateActaLink si aplica
  -> limpia draft
  -> toast
  -> refresh

Si guarda REGISTRO_DOCUMENTAL
  -> valida fecha + documento
  -> upsertActa sin asistentes ni invitados
  -> uploadActaPdf / updateActaLink si aplica
  -> limpia draft
  -> toast específico
  -> refresh

Usuario ve detalle
  -> ActaDetail adapta la lectura según modo_registro

Usuario elimina
  -> ConfirmDialog
  -> deleteActa
  -> refresh
```

---

## 13. Nota Final para Futuras Iteraciones

La tentación más peligrosa en este módulo es tratar `REGISTRO_DOCUMENTAL` como una excepción temporal sin contrato propio. Eso ya no es cierto. Hoy el modo documental es parte explícita del modelo, del snapshot, de las métricas, del formulario y de la migración.

Si una mejora nueva no parte desde esa realidad, es muy probable que rompa compatibilidad entre UI, dominio, SQL y lectura operativa.
