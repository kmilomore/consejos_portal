# Contexto General Unificado

> Ultima actualizacion: 2026-05-27
> Objetivo: ofrecer una vista unica del portal para entender arquitectura, modulos, datos, permisos e invariantes sin tener que abrir todos los contextos desde cero.

---

## 1. Que es este proyecto

`Consejos/` es un portal de Consejos Escolares construido con Next.js 15, React 19, TypeScript y Tailwind CSS.

El despliegue es estatico. No hay servidor Node propio en produccion para resolver logica de negocio del portal. La autenticacion, los datos y la autorizacion se apoyan en Supabase.

El sistema esta organizado alrededor de tres capas:

1. autenticacion de usuario por Google Workspace
2. resolucion de alcance y permisos por email autenticado
3. operacion por establecimiento escolar o por alcance global

---

## 2. Vista del sistema

### Frontend

- Next.js App Router
- React 19
- TypeScript
- Tailwind CSS

### Datos y acceso

- Supabase Auth para inicio de sesion
- PostgreSQL con RLS para autorizacion real
- Supabase Storage para evidencias documentales

### Restriccion arquitectonica clave

El portal se exporta como sitio estatico. Por eso no debe depender de API routes propias ni de server actions para el flujo critico del negocio.

---

## 3. Flujo general del portal

1. El usuario inicia sesion con Google.
2. El cliente obtiene la sesion de Supabase.
3. El backend resuelve el acceso efectivo usando el email del JWT y las tablas de acceso.
4. `get_current_portal_scope()` determina alcance, escuela por defecto, ruta de aterrizaje y capacidades.
5. El shell autenticado monta los datos compartidos mediante snapshot.
6. Los modulos trabajan sobre ese alcance sin volver a descubrir permisos desde cero.

---

## 4. Modulos principales

### Usuarios

Gestiona accesos manuales sobre `usuario_establecimiento_roles`.

Documento operativo:
- [Contexto de usuarios](../app/admin/context-usuarios.md)

### Auditoria

Consolida eventos operativos del portal y cambios de acceso para dar trazabilidad a ingresos, acciones y modificaciones administrativas.

Documento operativo:
- [Contexto de auditoria](../app/admin/context-auditoria.md)

### Programacion

Planifica, edita, cancela y vincula sesiones del consejo escolar.

Documento operativo:
- [Contexto de programacion](../app/programacion/context_programacion.md)

### Actas

Registra, edita, visualiza, imprime y elimina actas en modalidad completa o documental.

Documento operativo:
- [Contexto de actas](../app/actas/context-actas.md)

### Metricas

Deriva indicadores desde el snapshot compartido, sin fetch propio por pagina.

Documento operativo:
- [Contexto de metricas](../app/metricas/context_metricas.md)

---

## 5. Contextos y jerarquia documental

La documentacion queda organizada asi:

- [Centro de documentacion](./README.md): indice general
- [Contexto general unificado](./contexto-general.md): vista ejecutiva y tecnica consolidada
- [Seguridad del portal](./seguridad.md): acceso, RLS, riesgos y endurecimientos
- [Contexto raiz del proyecto](../context.md): fuente amplia del estado del portal
- contextos operativos por modulo: detalle funcional y de iteracion

Regla practica:

- usa este archivo para orientarte
- usa `context.md` para el estado amplio del producto
- usa los contextos de modulo para trabajar en cambios locales
- usa `seguridad.md` cuando el cambio toque acceso, permisos, datos o exposicion

---

## 6. Invariantes transversales

### Acceso

- el cliente no es la fuente de verdad del acceso
- el alcance efectivo sale del backend y de RLS
- el email autenticado debe corresponder al dominio institucional permitido

### Datos

- las paginas no deben duplicar fetch si ya existe proveedor compartido
- el snapshot compartido es la base para evitar recargas, flashes y consultas repetidas

### Navegacion

- las rutas internas deben conservar formato consistente con slash final
- el shell autenticado debe mantenerse estable durante la navegacion

### Seguridad

- no confiar en sugerencias de frontend como sustituto de validacion backend
- no abrir lectura publica de tablas operativas si el portal es autenticado
- toda mutacion debe pasar por permisos efectivos, no por banderas cosmeticas del cliente

---

## 7. Tablas y contratos importantes

### Acceso y autorizacion

- `usuario_establecimiento_roles`
- `usuarios_perfiles`
- funciones como `is_global_admin()`, `current_accessible_rbds()` y `get_current_portal_scope()`

### Operacion

- `establecimientos`
- `programacion`
- `actas`
- `actas_invitados`
- `logs`
- `portal_access_audit`

### Storage

- bucket `evidencias_actas`

---

## 8. Punto unico para seguridad

Toda decision de seguridad, acceso y endurecimiento debe quedar reflejada tambien en:

- [Seguridad del portal](./seguridad.md)

Eso incluye:

- autenticacion
- dominio permitido
- RLS
- acceso por escuela
- acceso global
- storage
- exposiciones publicas
- riesgos pendientes

---

## 9. Ruta recomendada para trabajo con IA o mantencion

### Para entender rapido el sistema

1. [Centro de documentacion](./README.md)
2. [Contexto general unificado](./contexto-general.md)
3. [Seguridad del portal](./seguridad.md)

### Para modificar un modulo

1. [Contexto general unificado](./contexto-general.md)
2. [Seguridad del portal](./seguridad.md)
3. Contexto operativo del modulo

### Para tocar acceso o RLS

1. [Seguridad del portal](./seguridad.md)
2. [Contexto raiz del proyecto](../context.md)
3. Contexto del modulo afectado
