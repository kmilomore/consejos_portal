# Contexto Operativo: Programacion

> Ultima actualizacion: 2026-04-27  
> Objetivo: este documento es la fuente de verdad operativa de la seccion `programacion/` y esta pensado para iterar con IA sin tener que redescubrir el modulo en cada sesion.
> Contexto general del portal: ver `../../context.md` para arquitectura global, decisiones transversales y estado general del producto.

---

## 1. Proposito del modulo

La seccion de programacion permite planificar, ajustar y cerrar el ciclo de sesiones del consejo escolar por establecimiento activo.

Hoy cubre estos casos reales:

- crear programaciones nuevas
- editar programaciones existentes
- cancelar logicamente una programacion
- reprogramar visualmente mediante drag-and-drop en el calendario
- crear un acta a partir de una programacion
- abrir el acta ya vinculada cuando la sesion esta realizada
- filtrar por tipo, estado y busqueda textual para establecimientos con alto volumen

La experiencia esta pensada para trabajar sobre una escuela activa, no como un backoffice global desacoplado del resto del portal.

---

## 2. Archivos fuente de verdad

### UI principal

- `app/programacion/page.tsx`
  Pantalla completa de programacion. Contiene calendario, formulario, agenda diaria, tabla, filtros y flujos de acciones.

### Capa de datos

- `lib/supabase/queries.ts`
  Fuente de verdad de mutaciones y del correlativo oficial. Toda alta, edicion, cancelacion y enlace con actas pasa por aqui.

### Puente con actas

- `components/portal/acta-form.tsx`
  Recibe `initialProgramacion` para abrir una acta ya precargada desde una programacion.

- `components/portal/acta-detail.tsx`
  Se reutiliza desde programacion para ver una acta ya vinculada en modo lectura.

### Contextos compartidos

- `lib/supabase/use-portal-snapshot.tsx`
  Exposicion de `snapshot` y `refresh()` para evitar fetches por pantalla.

- `lib/supabase/auth-context.tsx`
  Fuente de verdad de escuela activa, perfil y `selectedRbd`.

### Tipos

- `types/domain.ts`
  Define `Programacion`, `PlanningStatus`, `SessionType` y el resto del dominio.

---

## 3. Modelo mental del modulo

Hay que pensar programacion como una capa intermedia entre la planificacion y el registro formal.

Estados operativos:

- `PROGRAMADA`: sesion vigente, editable, cancelable y reprogramable.
- `REALIZADA`: sesion ya cerrada mediante acta vinculada. No debe tratarse como editable.
- `CANCELADA`: sesion anulada logicamente. No debe volver a ofrecer acciones de acta.

Relacion central:

- una `programacion` puede terminar vinculada a una `acta`
- cuando eso ocurre, `acta_vinculada_id` queda registrado en la programacion
- la programacion cambia a estado `REALIZADA`
- desde ese momento la pantalla debe privilegiar lectura y trazabilidad, no edicion

---

## 4. Flujo de datos real

### 4.1 Origen de datos

La pagina no hace fetch manual de base de datos por su cuenta. Consume:

- `snapshot.programaciones`
- `snapshot.actas`
- `snapshot.establishments`

todo llega desde `usePortalSnapshot()`.

### 4.2 Escuela activa

La pantalla resuelve la escuela activa asi:

1. `selectedRbd`
2. `establishment?.rbd`
3. `profile?.rbd`

Esa resolucion termina en `activeRbd`. Toda la vista depende de esa variable.

### 4.3 Dataset derivado

La pagina trabaja con dos subconjuntos:

- `baseRows`: programaciones del `snapshot` filtradas por `activeRbd`
- `rows`: `baseRows` mas filtros de tipo, estado y busqueda textual

Todo lo visual debe colgar de `rows` para que calendario, agenda diaria y tabla se mantengan consistentes.

### 4.4 Refresco

Despues de una mutacion no se vuelve a consultar manualmente una tabla puntual. Se llama `refresh()` del snapshot.

Esto mantiene el modelo de datos compartido y evita estados parciales entre modulos.

---

## 5. Correlativos y reglas de negocio

### 5.1 Fuente de verdad del correlativo

El numero de sesion oficial no se decide en cliente. Sale de la RPC:

- `get_next_session_number(establishment_rbd, session_type, target_year)`

Wrapper en cliente:

- `getNextSessionNumber()` en `lib/supabase/queries.ts`

### 5.2 Que considera el correlativo

El correlativo toma en cuenta tanto:

- filas existentes en `programacion`
- actas ya registradas para ese `rbd`, `tipo_sesion` y anio

### 5.3 Regla importante

No contar sesiones en cliente para decidir el numero final de una programacion.

Hay una funcion local `nextSessionNumber()` en `acta-form.tsx`, pero su uso actual es solo de precarga UX para actas manuales nuevas. No debe reinterpretarse como fuente de verdad para programacion.

### 5.4 Edicion y recalculo

Al editar una programacion:

- si se mantiene mismo tipo y mismo anio, puede conservar su `numero_sesion`
- si cambia tipo o anio, puede necesitar recalculo

### 5.5 Reprogramacion por drag-and-drop

La reprogramacion visual usa `updateProgramacion()`.

Comportamiento actual:

- si la sesion cae en el mismo anio, intenta conservar `numero_sesion`
- si cambia de anio, deja que `updateProgramacion()` recalcule el correlativo

Este comportamiento debe preservarse salvo que negocio defina otra regla.

---

## 6. Flujos funcionales vigentes

### 6.1 Crear programacion

Ruta actual:

1. el usuario selecciona fecha en el calendario o la escribe en el formulario
2. completa tipo, formato, hora, lugar y tematicas
3. la UI resuelve el correlativo esperado
4. al guardar se ejecuta `createProgramacion()`
5. la mutacion vuelve a resolver correlativo real desde la RPC
6. al guardar bien se muestra toast y se hace `refresh()`

Validaciones base vigentes:

- debe existir `activeRbd`
- fecha obligatoria
- hora obligatoria
- lugar obligatorio
- tematicas obligatorias
- si no hay correlativo resuelto, no se guarda

### 6.2 Editar programacion

Ruta actual:

1. el usuario pulsa `Editar`
2. la fila pasa a `editingProgramacion`
3. el formulario se precarga desde `programacionToForm()`
4. al guardar se llama `updateProgramacion()`
5. la pagina se resetea a modo creacion y refresca snapshot

Restriccion importante:

- una programacion con `acta_vinculada_id` no debe ofrecer edicion normal

### 6.3 Cancelar programacion

Ruta actual:

1. el usuario pulsa `Cancelar`
2. se abre `ConfirmDialog`
3. se ejecuta `cancelProgramacion(programacionId)`
4. la fila se marca con `estado = CANCELADA`
5. se hace `refresh()`

Nota:

- hoy no existe hard delete en este modulo

### 6.4 Reprogramar visualmente

Ruta actual:

1. el usuario arrastra una sesion desde el chip de un dia del calendario
2. la deja sobre otra fecha
3. `handleDropProgramacion(targetDate)` busca la fila en `baseRows`
4. valida que sea `PROGRAMADA` y sin `acta_vinculada_id`
5. ejecuta `updateProgramacion()` con la nueva fecha
6. actualiza `selectedDate` y `viewDate`
7. hace `refresh()`

Restricciones vigentes:

- no reprogramar sesiones `REALIZADA`
- no reprogramar sesiones `CANCELADA`
- no reprogramar sesiones con acta vinculada

### 6.5 Crear acta desde programacion

Ruta actual:

1. el usuario pulsa `Crear acta` sobre una programacion
2. se abre `ActaForm` con `initialProgramacion`
3. `acta-form.tsx` usa `programacionToForm(initialProgramacion, ...)`
4. el form queda precargado con tipo, fecha, hora, lugar, formato y origen
5. al guardar, `upsertActa()` recibe `programacion_origen_id`
6. `upsertActa()` actualiza la programacion origen con:
   - `acta_vinculada_id = savedId`
   - `estado = REALIZADA`

Invariante:

- el cierre de una programacion por acta se produce en la mutacion de acta, no en la UI

### 6.6 Ver acta vinculada desde programacion

Ruta actual:

1. una fila con `acta_vinculada_id` muestra `Ver acta`
2. `handleOpenLinkedActa()` busca el acta en `snapshot.actas`
3. si existe, abre `ActaDetail`
4. si no existe, muestra toast de error

### 6.7 Filtros para alto volumen

Filtros actuales:

- texto libre
- tipo de sesion
- estado

La busqueda textual hoy revisa:

- `rbd`
- `tipo_sesion`
- `formato_planeado`
- `lugar_tentativo`
- `tematicas`
- `estado`
- `numero_sesion`

---

## 7. Estructura de la pagina

La pantalla tiene cinco zonas principales.

### 7.1 Banner de datos

`DataBanner` muestra origen, estado y diagnosticos del snapshot.

### 7.2 Calendario mensual

Responsable de:

- navegar entre meses
- seleccionar fecha activa
- mostrar cantidad diaria
- mostrar hasta dos sesiones resumidas por dia
- actuar como drop target para reprogramacion visual

### 7.3 Formulario lateral

Responsable de:

- crear nueva sesion
- editar sesion existente
- mostrar el correlativo esperado
- salir del modo edicion

### 7.4 Agenda diaria

Responsable de:

- listar sesiones de la fecha seleccionada
- mostrar estado y vinculo con acta
- exponer acciones rapidas por fila

### 7.5 Tabla completa

Responsable de:

- ver el historico filtrado
- operar sobre volumen grande
- mantener las mismas reglas de acciones que la agenda diaria

---

## 8. Invariantes tecnicas que no deben romperse

### 8.1 No hacer fetch manual desde la pagina

No agregar `useEffect` para consultar Supabase directo desde `app/programacion/page.tsx`.

Si se necesita mas data:

- extender `fetchPortalSnapshot()`
- propagarlo por `PortalSnapshotProvider`

### 8.2 No duplicar reglas de negocio en UI si ya existen en queries

El cliente puede anticipar estados y bloquear botones, pero la mutacion final debe seguir centralizada en `lib/supabase/queries.ts`.

### 8.3 No tratar `REALIZADA` como editable

Si una sesion ya tiene acta vinculada, el flujo debe orientarse a lectura o trazabilidad.

### 8.4 No reintroducir loaders globales tipo `app/loading.tsx`

Este modulo fue parte del problema de sensacion de salida/reentrada de pagina. Si hay carga local, usar skeletons dentro de la pagina.

### 8.5 Mantener consistencia entre calendario, agenda y tabla

Si agregas filtros, agrupaciones o nuevos estados, los tres bloques deben seguir la misma fuente de datos derivada.

### 8.6 Usar `refresh()` despues de mutaciones

No parchear manualmente varios estados locales complejos si el snapshot ya es la fuente de verdad compartida.

---

## 9. Cosas que evitar

Evitar estas decisiones, porque ya son focos conocidos de regresion:

- contar correlativos solo con el arreglo local de programaciones
- dejar habilitado `Editar` sobre filas con `acta_vinculada_id`
- permitir `Crear acta` en sesiones `CANCELADA`
- permitir reprogramacion visual de sesiones ya cerradas
- agregar fetches directos en la pagina fuera del snapshot
- actualizar una fila localmente y olvidar `refresh()`
- aplicar filtros solo en la tabla y no en calendario o agenda
- introducir un estado local adicional que compita con `editingProgramacion`
- mezclar logica de autorizacion con logica visual de la pagina
- asumir que un acta vinculada siempre estara en memoria sin validar `snapshot.actas`

---

## 10. Riesgos funcionales al modificar este modulo

### 10.1 Riesgo de correlativos duplicados

Pasa si alguien intenta resolver numeros solo en frontend o saltea la RPC al reprogramar, editar o crear.

### 10.2 Riesgo de estado inconsistente programacion/acta

Pasa si se crea un flujo nuevo de actas que no informa `programacion_origen_id`, o si se cambia `upsertActa()` sin preservar la actualizacion de `acta_vinculada_id` y `REALIZADA`.

### 10.3 Riesgo de UX inconsistente

Pasa si se agrega una accion en tabla pero no en agenda diaria, o viceversa.

### 10.4 Riesgo de data oculta por filtros

Si se agregan nuevos filtros, hay que decidir si afectan solo tabla o toda la experiencia. Hoy afectan toda la experiencia visible.

---

## 11. Guía de intervención para IA

Cuando una IA tenga que tocar programacion, deberia seguir este orden:

1. revisar `app/programacion/page.tsx`
2. verificar si el cambio afecta reglas de negocio o solo UI
3. si afecta negocio, revisar `lib/supabase/queries.ts`
4. si afecta creacion de actas desde programacion, revisar `components/portal/acta-form.tsx`
5. validar si el cambio requiere ampliar `snapshot` o solo usar datos ya disponibles
6. despues del primer cambio sustantivo, correr una validacion puntual

Preguntas que la IA debe responder antes de editar:

- esto vive en UI o en capa de datos
- cambia correlativos o estados
- toca el flujo de acta vinculada
- necesita nuevas columnas o datos del snapshot
- debe verse igual en calendario, agenda y tabla

---

## 12. Recetas rapidas de cambios comunes

### Quiero agregar un nuevo filtro

Tocar:

- estado local del filtro en `app/programacion/page.tsx`
- derivacion de `rows`
- UI del panel de filtros

Verificar:

- que afecte calendario, agenda y tabla
- que no rompa `selectedDateRows`

### Quiero agregar una accion nueva por fila

Tocar:

- bloque de acciones en agenda diaria
- bloque de acciones en tabla
- helper local si requiere logica compartida

Verificar:

- que respete `estado`
- que respete `acta_vinculada_id`

### Quiero cambiar la regla de reprogramacion

Tocar:

- `handleDropProgramacion()` en `app/programacion/page.tsx`
- probablemente `updateProgramacion()` en `lib/supabase/queries.ts`

Verificar:

- mismo anio vs cambio de anio
- correlativo
- restricciones por estado

### Quiero crear otra forma de cerrar una sesion

Tocar:

- flujo que persiste acta o cierre
- `upsertActa()` si sigue siendo la via canónica
- estados de programacion

Verificar:

- que la programacion quede trazable
- que no quede editable tras cerrarse

---

## 13. Checklist de validacion despues de cambios

Checklist minimo:

1. `npm run build`
2. crear una programacion nueva
3. editar una programacion sin acta
4. cancelar una programacion
5. arrastrar una programacion programada a otra fecha
6. crear un acta desde programacion
7. abrir `Ver acta` desde una sesion realizada
8. probar filtros con varias filas y verificar que calendario y tabla coincidan

Si el cambio toca correlativos o cierre de sesiones, revisar tambien datos en Supabase.

---

## 14. Deudas y pendientes conocidas

Pendientes vigentes relacionados con programacion:

- no existe hard delete de programaciones
- la reprogramacion visual hoy vive en cliente y depende de `updateProgramacion()` para preservar reglas; si negocio se complejiza, podria necesitar una mutacion especifica
- no hay vista historica avanzada ni auditoria por cambio de fecha
- no existe batch update para volumen grande

---

## 15. Prompt base recomendado para iterar con IA

Usar algo cercano a esto para futuras sesiones:

"Trabaja sobre `app/programacion/page.tsx` tomando `context_programacion.md` como fuente de verdad. Antes de editar, valida si el cambio es solo UI o tambien negocio en `lib/supabase/queries.ts`. No reintroduzcas fetches fuera de `usePortalSnapshot()`, no rompas el flujo `programacion -> acta`, y conserva la regla de correlativos por RPC. Si agregas acciones o filtros, deben mantenerse consistentes entre calendario, agenda diaria y tabla."

---

## 16. Resumen corto para no perder el norte

Programacion no es solo una vista calendario. Es el orquestador del ciclo:

- planificar
- ajustar
- cancelar
- ejecutar
- enlazar acta
- dejar la sesion cerrada y trazable

Si un cambio mejora la UX pero rompe ese ciclo, esta mal diseñado.