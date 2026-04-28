# Contexto del modulo /metricas

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
