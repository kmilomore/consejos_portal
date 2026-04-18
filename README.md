# Portal de Consejos Escolares

Subdominio base para alojar la sección de Consejos Escolares dentro del ecosistema del portal institucional. El proyecto está montado con Next.js, TypeScript y Tailwind CSS, configurado para exportarse como sitio estático sin servidor Node en producción y consumir Supabase directamente desde el navegador.

## Stack

- Next.js 15 con App Router
- React 19 + TypeScript 5
- Tailwind CSS 3
- Supabase consumido desde cliente con fallback local si la lectura falla
- ESLint con configuración de Next

## Qué deja resuelto este scaffold

- Estructura inicial de UI para dashboard, programación, actas y métricas
- Datos mock como respaldo para no romper el portal si falla la lectura cliente
- Migración SQL inicial con tablas, RLS, bucket y función `get_next_session_number`
- Diseño base listo para evolucionar a un portal privado para directores y administradores
- Export estático listo para publicar en Apache, Nginx, IIS, Netlify o GitHub Pages

## Estructura

```txt
Consejos/
├── app/
│   ├── auth/login/
│   ├── programacion/
│   ├── actas/
│   └── metricas/
├── components/
├── lib/
├── supabase/migrations/
└── types/
```

## Instalación

```bash
npm install
npm run dev
```

Para generar el sitio estático listo para despliegue:

```bash
npm run build
```

El build genera la carpeta `out/` con HTML, CSS y JS listos para publicarse en hosting estático.

Para previsualizar localmente la carpeta exportada:

```bash
npm run preview
```

## Variables de entorno

Para leer datos reales desde Supabase en un sitio estático se requieren variables públicas en el frontend:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_APP_NAME=Portal Consejos Escolares
```

No uses `SUPABASE_SERVICE_ROLE_KEY` en este proyecto estático.

Si Supabase tiene datos pero la UI muestra cero registros, el problema normalmente está en RLS o en que no existe una sesión autenticada en el navegador.

## Producción pública

Si el portal se publica sin login y debe leer Supabase desde el navegador con el rol `anon`, aplica también la migración `supabase/migrations/20260416_consejos_public_read_anon.sql`.

Sin esa migración, el diagnóstico de producción mostrará tablas vacías aunque los datos existan, porque las políticas iniciales solo permiten lectura a admin o al RBD de la sesión autenticada.

## Producción autenticada por escuela

Para el flujo OTP por correo y portal por establecimiento, aplica también la migración `supabase/migrations/20260416_consejos_auth_bootstrap_from_base.sql`.

Esa migración:

- normaliza filas desde `public."BASE DE DATOS ESCUELAS SLEP"`
- sincroniza `establecimientos` desde esa base maestra
- crea o actualiza `usuarios_perfiles` automáticamente para el usuario autenticado según su correo

Condición clave: la tabla `BASE DE DATOS ESCUELAS SLEP` debe contener el `RBD` y un correo del director o responsable en alguna variante de columna como `CORREO ELECTRONICO`, `CORREO`, `EMAIL` o equivalente.

## Modelo funcional incluido

Se modelaron estas entidades iniciales:

- `usuarios_perfiles`
- `establecimientos`
- `programacion`
- `actas`
- `actas_invitados`
- `logs`

Además, la migración crea:

- tipos enum para roles, formatos y estados
- bucket `evidencias_actas`
- políticas RLS base por rol y RBD
- función `public.get_next_session_number(session_type, establishment_rbd, target_year)`

## Próximos pasos recomendados

1. Ajustar los datos estáticos en `lib/data/mock.ts` según los establecimientos reales.
2. Publicar la carpeta `out/` en el hosting estático que usen para el portal.
3. Verificar que el `anon key` y las políticas RLS permitan leer `establecimientos`, `programacion`, `actas` y `actas_invitados` desde el navegador.
4. Implementar autenticación real si el acceso debe seguir restringido por RBD o rol.# consejos_portal
