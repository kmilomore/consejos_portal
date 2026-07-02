# Centro de Documentacion

> Ultima actualizacion: 2026-07-02
> Objetivo: concentrar en un solo lugar la documentacion del portal, enlazar los contextos operativos y ofrecer una ruta rapida para trabajo funcional, tecnico y de seguridad.

---

## 1. Punto de entrada

Si necesitas una sola puerta de entrada para entender el proyecto, comienza por estos documentos:

1. [Contexto general unificado](./contexto-general.md)
2. [Seguridad del portal](./seguridad.md)
3. [Contexto raiz del proyecto](../context.md)

---

## 2. Mapa de documentacion

### Vision general

- [Contexto general unificado](./contexto-general.md)
- [Contexto raiz del proyecto](../context.md)

### Seguridad

- [Seguridad del portal](./seguridad.md)

### Sitio publico

- [Contexto de la landing publica y paginas legales](../components/landing/context-landing.md)

### Modulos operativos

- [Contexto de usuarios](../app/admin/context-usuarios.md)
- [Contexto de auditoria](../app/admin/context-auditoria.md)
- [Contexto de programacion](../app/programacion/context_programacion.md)
- [Contexto de actas](../app/actas/context-actas.md)
- [Contexto de metricas](../app/metricas/context_metricas.md)

---

## 3. Como leer esta documentacion

### Si quieres entender el sistema completo

Lee en este orden:

1. [Contexto general unificado](./contexto-general.md)
2. [Seguridad del portal](./seguridad.md)
3. [Contexto raiz del proyecto](../context.md)

### Si vas a trabajar en un modulo especifico

Lee en este orden:

1. [Contexto general unificado](./contexto-general.md)
2. [Seguridad del portal](./seguridad.md)
3. El contexto operativo del modulo correspondiente

### Si vas a tocar permisos, autenticacion o RLS

Lee en este orden:

1. [Seguridad del portal](./seguridad.md)
2. [Contexto general unificado](./contexto-general.md)
3. [Contexto raiz del proyecto](../context.md)
4. Contexto del modulo afectado

---

## 4. Relacion entre documentos

- `context.md` sigue siendo la fuente amplia del estado del portal y de sus decisiones transversales.
- `docs/contexto-general.md` sintetiza esa informacion para dar una vista unificada y de rapida lectura.
- `docs/seguridad.md` concentra autenticacion, autorizacion, RLS, storage, riesgos y endurecimientos.
- Los contextos de cada modulo conservan el detalle operativo y funcional que no conviene mezclar en el resumen general.

---

## 5. Regla de mantenimiento

Cuando cambie una decision transversal, revisar:

1. [Contexto general unificado](./contexto-general.md)
2. [Seguridad del portal](./seguridad.md) si afecta acceso o datos
3. El contexto operativo del modulo afectado

Cuando cambie solo un flujo local, actualizar primero el contexto del modulo y luego ajustar el hub solo si cambia el mapa documental.
