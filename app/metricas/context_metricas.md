# Contexto del modulo /metricas

> Ultima actualizacion: 2026-05-12

## Objetivo

La pagina `/metricas` consolida indicadores operativos y normativos del portal de Consejos Escolares sin hacer fetch propio. Todo el contenido se deriva desde `usePortalSnapshot()`.

## Fuente de datos

### Regla principal

`app/metricas/page.tsx` debe consumir exclusivamente:

- `snapshot.actas`
- `snapshot.programaciones`
- `snapshot.establishments`
- `snapshot.attendanceByRole`

No se deben agregar consultas directas a Supabase desde esta pagina.

### Flujo de carga

1. `PortalSnapshotProvider` se monta en el shell de la app.
2. `usePortalSnapshot()` expone `snapshot`, `status` y `refresh`.
3. `fetchPortalSnapshot()` arma el snapshot en `lib/supabase/queries.ts`.
4. `app/metricas/page.tsx` deriva todas las metricas y tablas en memoria.

### Hallazgo operativo 2026-05-12

Se confirmo que el problema de skeleton y recarga al cambiar de modulo no debia resolverse dentro de `/metricas`, sino en la capa compartida de providers:

- aunque la pagina no hace fetch propio, podia volver a verse como “recargando” si `PortalSnapshotProvider` o `PortalAuthProvider` perdian estado efectivo al navegar
- en export estatico, un cache solo en memoria no es suficiente para blindar la experiencia de `/metricas`
- por eso este modulo depende de snapshot persistido, cliente Supabase singleton y deduplicacion de requests en vuelo

Consecuencia practica:

- si `/metricas` vuelve a mostrar skeleton o recalcular desde cero al cambiar de seccion, primero revisar `lib/supabase/use-portal-snapshot.tsx`, `lib/supabase/auth-context.tsx` y `lib/supabase/client.ts`
- no intentar “arreglar” este sintoma agregando un fetch local dentro de la pagina

Hallazgo adicional del mismo dia:

- una escuela puede tener acta correcta en `snapshot.actas` y existir en `establecimientos`, pero igual seguir figurando como faltante si el navegador conserva un snapshot persistido anterior a la mutacion
- tambien puede pasar que `/admin/` no la encuentre si `get_slep_directorio()` no la retorna aunque `establecimientos` si la tenga

Patron correcto vigente para consistencia:

- las mutaciones de `actas` y `programacion` deben invalidar la version global del snapshot para forzar revalidacion en la siguiente lectura
- `PortalSnapshotProvider` debe considerar stale los snapshots heredados o version antigua aunque ya exista cache persistido
- si una inconsistencia afecta metricas y admin al mismo tiempo, revisar primero el cruce entre `actas`, `establecimientos` y `get_slep_directorio()`

## Que muestra la pagina

### 1. KPIs superiores

La cabecera de metricas muestra cuatro indicadores globales basados en `snapshot.actas`:

- `Sesiones realizadas`: total de actas registradas dentro del alcance actual.
- `Sesiones ordinarias`: conteo de actas del tipo `Ordinaria`.
- `Sesiones extraordinarias`: conteo de actas del tipo `Extraordinaria`.
- `Cumplimiento de ordinarias`: porcentaje de sesiones ordinarias registradas contra la meta anual.

### 2. Asistencia por estamento

Se mantiene el grafico `AttendanceChart` usando `snapshot.attendanceByRole`.

### 3. Avance por sesion ordinaria

La pagina calcula el avance normativo de las sesiones ordinarias `1`, `2`, `3` y `4`.

Para cada numero de sesion muestra:

- cantidad de establecimientos que ya registraron esa sesion ordinaria
- porcentaje de avance respecto del total de establecimientos en alcance
- cantidad de establecimientos pendientes para cerrar esa sesion
- accion de click para desplegar el listado de escuelas que aun no cumplen esa sesion

### 4. Sesiones realizadas por comuna

La pagina calcula la distribucion territorial en base a `snapshot.actas` y muestra:

- total de sesiones por comuna
- separacion entre ordinarias y extraordinarias
- porcentaje relativo sobre el total de sesiones realizadas

### 5. Top de establecimientos

La pagina arma un ranking `Top 3` de escuelas con mayor cantidad de sesiones realizadas en el ano.

Para cada establecimiento muestra:

- nombre
- RBD
- comuna
- total de sesiones
- desglose entre ordinarias y extraordinarias

### 6. Trazabilidad y acceso al registro

La tabla inferior lista cada sesion consolidada con:

- tipo de sesion
- numero de sesion
- RBD
- comuna
- fecha de referencia
- estado/origen del registro
- enlace a `/actas?acta=<id>` cuando existe un acta vinculada

Si no existe acta asociada, se muestra `Sin acta vinculada`.

## Como se consolida una sesion

La pagina usa `buildSessionMetricRows()` para unificar datos de `actas` y `programaciones`.

### Llave de consolidacion

Cada sesion se identifica por:

`rbd + tipo_sesion + numero_sesion`

Esto evita duplicar una programacion cuando ya existe el acta correspondiente.

### Prioridad de datos

- Si existe acta, esa fila se considera la fuente primaria de trazabilidad.
- Si solo existe programacion, la sesion aparece igual en metricas pero sin enlace a acta.
- Si una programacion trae `acta_vinculada_id`, ese id se reutiliza para construir el deep link.

## Formula de cumplimiento normativo

La normativa vigente considerada en esta pantalla es:

- `4 sesiones ordinarias al ano por establecimiento`

La formula aplicada es:

`sesiones_ordinarias_registradas / (establecimientos_en_scope * 4)`

### Detalle importante

- `sesiones_ordinarias_registradas` se calcula con `snapshot.actas` del alcance actual.
- `establecimientos_en_scope` toma `snapshot.establishments` y, como respaldo, los RBD presentes en las sesiones consolidadas.
- El valor se limita a `100%` para evitar sobrepasar la meta visual.

## Regla para avance por sesion 1 a 4

La pagina calcula cada bloque de avance con la formula:

`actas_ordinarias_del_numero / establecimientos_en_scope`

Donde `numero` corresponde a `1`, `2`, `3` o `4`.

### Detalle importante

- Solo considera actas ordinarias efectivamente registradas.
- El valor tambien se limita visualmente a `100%`.
- El faltante se expresa como `establecimientos_en_scope - actas_ordinarias_del_numero`.
- Al hacer click en una tarjeta de sesion, la pagina lista las escuelas pendientes comparando `snapshot.establishments` contra los RBD que ya tienen acta ordinaria para ese numero de sesion.
- Si no quedan escuelas pendientes, la UI informa explicitamente que la sesion ya fue cumplida por todos los establecimientos en alcance.
- Si el usuario acaba de guardar una acta y la pagina sigue mostrando un faltante, primero sospechar snapshot stale antes que error de formula.

## Deep link con /actas

La pagina `/metricas` enlaza a `/actas?acta=<id>`.

La pagina `app/actas/page.tsx`:

1. lee el query param `acta` con `useSearchParams()`
2. busca esa acta dentro de `snapshot.actas`
3. abre automaticamente `ActaDetail` cuando encuentra coincidencia

Esto permite navegar desde metricas al registro exacto sin duplicar UI ni estado.

## Invariantes del modulo

- No introducir fetches propios en `/metricas`.
- No recalcular metricas desde otra fuente que no sea el snapshot.
- Mantener la llave de consolidacion `rbd + tipo + numero`.
- Cualquier nueva accion sobre actas debe seguir reutilizando `/actas` como destino canonico.
- No romper la navegacion canonica con rutas mezcladas entre `/metricas` y `/metricas/`.
- No agregar estados de carga globales dentro de la pagina si el snapshot ya esta disponible.
- No limpiar ni invalidar el snapshot compartido por cambios de filtro, tabs o navegacion secundaria.
- No asumir que un faltante en metricas implica ausencia real de acta; confirmar siempre contra `actas` y version del snapshot.

## Archivos involucrados

- `app/metricas/page.tsx`
- `app/metricas/context_metricas.md`
- `app/actas/page.tsx`
- `lib/supabase/use-portal-snapshot.tsx`
- `lib/supabase/queries.ts`

## Checklist para cambios futuros

Antes de modificar `/metricas`, validar:

1. si el dato ya viene en `snapshot`
2. si la nueva metrica debe basarse en `actas`, `programaciones` o ambas
3. si la sesion necesita consolidacion por llave logica
4. si la navegacion debe resolverse reutilizando `/actas`
5. si la formula normativa cambia y hay que actualizar este documento
