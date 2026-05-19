# Login del portal

## Alcance

Esta sección documenta el comportamiento de [app/auth/login/page.tsx](app/auth/login/page.tsx) y su dependencia directa principal [components/auth/auth-screen.tsx](components/auth/auth-screen.tsx), apoyada por [lib/supabase/auth-context.tsx](lib/supabase/auth-context.tsx) y [lib/supabase/client.ts](lib/supabase/client.ts).

La ruta implementa acceso solo mediante Google OAuth.

- OAuth con Google.

## Responsabilidades de la página

[app/auth/login/page.tsx](app/auth/login/page.tsx) cumple dos funciones:

1. Renderiza la interfaz de autenticación mediante `AuthScreen`.
2. Ejecuta `AuthCallbackHandler`, que procesa el retorno de autenticación cuando Supabase redirige de vuelta al navegador.

En la implementación actual, la responsabilidad efectiva de esta página es resolver el callback OAuth y presentar el botón de ingreso.

## Flujo funcional

### 1. Inicialización del callback

Al cargar la página, `AuthCallbackHandler`:

- crea un cliente de Supabase con `createClient()`;
- inspecciona la URL actual;
- busca el parámetro `code`, típico del flujo OAuth.

### 2. Intercambio de código OAuth

Si existe `code`, la página ejecuta:

- `auth.exchangeCodeForSession(code)`.

Si el intercambio resulta exitoso:

- elimina `code` de la URL;
- usa `window.history.replaceState(...)` para evitar que el código quede visible en historial o copias de URL.

La sesión efectiva y la resolución de acceso no se cierran en esta página. Después del callback, [lib/supabase/auth-context.tsx](lib/supabase/auth-context.tsx) confirma la sesión real con Supabase, carga `usuarios_perfiles`, resuelve el alcance con `get_current_portal_scope` y recién entonces deja estabilizada la navegación hacia `/admin/` o `/resumen/`.

### 2.1. Rehidratación segura del estado auth

El portal persiste parte del estado autenticado en `sessionStorage` para resistir remounts del árbol autenticado en export estático. Desde la corrección del 2026-05-14, esa restauración quedó restringida al `user.id` confirmado por Supabase.

Esto evita un bug operativo observado en producción:

- un usuario autenticaba correctamente con Google;
- el callback completaba `exchangeCodeForSession(code)`;
- la UI rehidrataba un `landingRoute` o un scope cacheado de otro usuario en la misma pestaña;
- el guard terminaba devolviendo al ingreso o redirigiendo de forma incoherente.

Regla vigente:

- no rehidratar `session`, `landingRoute`, `profile`, `accessibleRbds` ni `selectedRbd` desde `sessionStorage` hasta conocer el usuario real de Supabase;
- limpiar el estado persistido al cerrar sesión o cuando no exista sesión válida.

### 3. Interfaz de autenticación

La UI real vive en [components/auth/auth-screen.tsx](components/auth/auth-screen.tsx). Su capacidad principal es:

- ingreso con Google mediante `signInWithGoogle()`;

## Comportamiento de AuthScreen

### Google OAuth

`signInWithGoogle()`:

- usa Supabase OAuth con proveedor `google`;
- construye `redirectTo` con `resolveAuthRedirectUrl()`, priorizando el origen actual del navegador para no desviar el callback a otro portal que comparta variables o proyecto Supabase;
- agrega `queryParams.hd` con el dominio configurado para sugerir cuentas del dominio institucional.

Este es el único flujo activo del login.

## Dependencias técnicas

### Cliente Supabase

[lib/supabase/client.ts](lib/supabase/client.ts) crea un cliente de navegador usando:

- `NEXT_PUBLIC_SUPABASE_URL`;
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

Si falta cualquiera de esas variables, la autenticación queda inoperante en el navegador.

### Contexto de autenticación

[lib/supabase/auth-context.tsx](lib/supabase/auth-context.tsx) centraliza:

- estado de sesión;
- carga de perfil del usuario desde la base;
- resolución de alcance de acceso;
- persistencia e hidratación segura del estado auth por usuario;
- login por Google;
- cierre de sesión.

Regla operativa vigente de acceso:

- el equipo interno del portal mantiene su lógica principal desde `usuarios_perfiles`;
- los directores deben poder resolver acceso desde `usuario_establecimiento_roles` cuando el correo autenticado coincide con `email_normalizado` o `correo_electronico`;
- ese fallback no debe convertir al equipo en directores ni reemplazar la lógica actual de representantes con cobertura parcial.

Esto implica que la página de login es una capa delgada: la lógica crítica de autenticación vive principalmente en el contexto.

## Supuestos operativos

Para que esta sección funcione correctamente deben cumplirse estas condiciones:

- Supabase Auth debe tener habilitado Google como proveedor OAuth.
- La URL de redirección debe incluir la ruta `/auth/login/`.
- En cliente, el callback OAuth se arma desde `window.location.origin`; `NEXT_PUBLIC_SITE_URL` queda como respaldo cuando no existe contexto de navegador.
- El proyecto debe validar y autorizar las cuentas Google autenticadas antes de conceder acceso útil al portal.

## Auditoría de seguridad

### Controles positivos observados

- La página limpia `code` desde la URL tras autenticación exitosa, reduciendo exposición accidental en historial, capturas o reenvío de enlaces.
- El flujo Google está claramente priorizado en la interfaz como mecanismo principal de acceso.

### Hallazgos

### 1. `hd` en Google OAuth no es una garantía de seguridad

Severidad: media

El parámetro `hd` enviado a Google mejora la experiencia y sugiere cuentas del dominio, pero no garantiza por sí mismo que el usuario autenticado pertenezca a ese dominio.

Impacto:

- falsa sensación de control si el backend asume que `hd` equivale a validación dura;
- posibilidad de aceptar usuarios externos si no se verifica el email resultante tras login.

Mitigación recomendada:

- validar en backend o en el proceso de bootstrap que el correo autenticado pertenezca realmente al dominio autorizado;
- denegar sesión útil o acceso a datos cuando el correo no cumpla la política institucional.

### 2. Restricción de dominio de Google no demostrada como control duro en el backend

Severidad: media

En el código revisado no aparece una validación local posterior al login que fuerce dominio permitido para usuarios Google. Puede que exista en Supabase, SQL o bootstrap, pero no está garantizado por esta sección.

Impacto:

- acceso potencial de cuentas no deseadas si el control real depende solo de configuración blanda o de convenciones;
- riesgo de desalineación entre intención operativa y control efectivo.

Mitigación recomendada:

- validar explícitamente el correo autenticado y su dominio en la capa de autorización real;
- documentar ese control en backend para que no quede implícito.

### 3. Manejo silencioso de errores en callback

Severidad: baja

Cuando `exchangeCodeForSession` falla dentro de `AuthCallbackHandler`, la página hoy muestra feedback mediante toast, pero no registra telemetría visible ni logging operacional duradero.

Impacto:

- menor trazabilidad operativa centralizada;
- diagnóstico más difícil de errores de autenticación o redirección.

Mitigación recomendada:

- propagar un estado de error visible para el usuario;
- registrar errores en observabilidad o logging seguro.

### Evaluación general

El login quedó reducido a un flujo Google-only y la superficie cliente ahora es más consistente con el modelo operativo declarado. El riesgo principal ya no es código residual, sino asegurar que la autorización posterior al login aplique validaciones duras sobre dominio y perfiles habilitados. La interfaz es razonable, pero no debe tratarse como frontera suficiente de seguridad por sí sola.

### Recomendaciones priorizadas

1. Validar dominio institucional del usuario autenticado en backend, no solo en la UI.
2. Confirmar que el alta o bootstrap de perfiles solo permita identidades Google autorizadas.
3. Agregar trazabilidad de errores en el callback de autenticación.

### Resumen ejecutivo

La página de login quedó alineada con el uso real del portal: acceso solo por Google. La limpieza redujo superficie innecesaria en cliente y simplificó la operación. Lo que queda por asegurar está del lado de autorización efectiva: comprobar dominio permitido y perfiles válidos después del login OAuth.
