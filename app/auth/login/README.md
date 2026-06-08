# Login del portal

## Alcance

Esta sección documenta el comportamiento de [app/auth/login/page.tsx](app/auth/login/page.tsx) y su dependencia directa principal [components/auth/auth-screen.tsx](components/auth/auth-screen.tsx), apoyada por [lib/auth/context.tsx](lib/auth/context.tsx) y [lib/supabase/client.ts](lib/supabase/client.ts).

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
- busca `code`, `error`, `error_code` y `error_description` tanto en querystring como en `hash`, para cubrir callbacks exitosos y errores devueltos por Supabase Auth.

### 2. Intercambio de código OAuth

Si existe `code`, la página ejecuta:

- `auth.exchangeCodeForSession(code)`.

Si Supabase devuelve un error OAuth antes del intercambio de sesión, la página:

- normaliza el mensaje para casos conocidos como `signup_disabled`;
- muestra toast y error visible en la UI;
- limpia los parámetros de auth desde la URL para no dejar enlaces reutilizables con estado de error.

Si el intercambio resulta exitoso:

- elimina `code` de la URL;
- usa `window.history.replaceState(...)` para evitar que el código quede visible en historial o copias de URL.

La sesión efectiva y la resolución de acceso no se cierran en esta página. Después del callback, [lib/auth/context.tsx](lib/auth/context.tsx) confirma la sesión real con Supabase, carga `usuarios_perfiles`, resuelve el alcance con `get_current_portal_scope` y recién entonces deja estabilizada la navegación hacia `/admin/` o `/resumen/`.

Desde el ajuste del 2026-05-27, el cliente ya no intenta bootstrapear perfiles automáticamente durante el login. Un usuario autenticado con Google solo obtiene acceso útil si la base del portal ya le resuelve alcance real mediante `usuario_establecimiento_roles` y `get_current_portal_scope()`.

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

El cliente debe tener `flowType: "pkce"` explícito. Con `@supabase/supabase-js` v2 y `detectSessionInUrl: false`, el flujo OAuth cae en implicit si no se fuerza PKCE. Ver incidente 2026-06-01 en diagnóstico operativo.

### Contexto de autenticación

[lib/auth/context.tsx](lib/auth/context.tsx) centraliza:

- estado de sesión;
- carga de perfil del usuario desde la base;
- resolución de alcance de acceso;
- persistencia e hidratación segura del estado auth por usuario;
- login por Google;
- cierre de sesión.

Regla operativa vigente de acceso:

- `usuario_establecimiento_roles` es la fuente de verdad del acceso;
- `get_current_portal_scope()` devuelve `role_text`, `is_global_admin`, `accessible_rbds`, `default_rbd`, `can_select_school`, `landing_route`, `is_read_only` y `can_manage_users`;
- autenticarse con Google no crea acceso portal por sí solo;
- `ADMIN` entra con acceso global y puede gestionar usuarios;
- `COLABORADOR` entra con acceso global de solo lectura;
- `REPRESENTANTE` entra a `/admin/` con cobertura parcial;
- `DIRECTOR` entra a `/resumen/` con su establecimiento resuelto.

Esto implica que la página de login es una capa delgada: la lógica crítica de autenticación vive principalmente en el contexto.

Regla importante desde 2026-05-26:

- `canSelectSchool` no equivale a permiso de escritura;
- un colaborador global puede navegar y cambiar escuela activa para revisar datos, pero el resto del portal debe seguir en modo read-only.

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

Severidad: cerrada

El callback ya no maneja los errores de forma silenciosa. Desde el ajuste del 2026-05-27 distingue y muestra en UI:

- callback sin `code`;
- error OAuth devuelto directamente por Supabase en la URL (`error`, `error_code`, `error_description`);
- error de `exchangeCodeForSession(code)`;
- callback exitoso con sesión intercambiada.

Estado actual:

- los errores más comunes ya quedan visibles mediante toast y mensaje persistente en pantalla;
- el diagnóstico operativo sigue mejorando con logging cliente, aunque aún no existe observabilidad centralizada.

## Diagnóstico operativo en producción

El bootstrap auth ahora emite trazas cliente bajo los scopes `auth.callback` y `auth.bootstrap`.

Siempre visibles:

- `logger.error(...)` se mantiene activo también en producción.

Trazas detalladas (`info` y `warn`):

- habilitar con `NEXT_PUBLIC_DEBUG_AUTH=true` al compilar; o
- activar manualmente en el navegador con `localStorage.setItem("consejos.debug.auth", "true")` y luego recargar.

Hitos que quedan trazados:

- inicio de callback OAuth;
- error OAuth directo devuelto por Supabase antes del intercambio de sesión;
- éxito o error de `exchangeCodeForSession(code)`;
- inicio del bootstrap de acceso;
- resultado de lectura de `usuarios_perfiles`;
- fallback por `get_current_portal_scope()` cuando no hay perfil persistido;
- hidratación de perfil sintético cuando el scope SQL ya autoriza acceso real en portal;
- flags de alcance `is_read_only` y `can_manage_users` cuando el scope se resuelve por SQL.
- error al resolver `establecimientos` por `rbd`;
- cierre exitoso del bootstrap con `landingRoute`, RBD accesibles y escuela resuelta.

### Hallazgo operativo vigente

Se corrigieron dos incoherencias operativas en el fallback de acceso:

- si `usuarios_perfiles` no devolvía fila, el cliente solo aceptaba el scope resuelto cuando `role_text === "DIRECTOR"`;
- eso rechazaba colaboradores globales y otros accesos válidos resueltos por SQL;
- desde el ajuste del 2026-05-25, el cliente acepta cualquier scope portal real devuelto por `get_current_portal_scope()`;
- desde el ajuste del 2026-05-27, el login ya no llama `bootstrap_current_user_profile_from_base_escuelas()` para crear acceso implícito durante el ingreso.

Esto deja una regla más dura: Google autentica identidad, pero la autorización final solo existe si la base del portal ya tiene acceso activo para ese correo.

### Incidente 2026-06-01 — implicit flow silencioso con `detectSessionInUrl: false`

Severidad: crítica (login completamente inoperante en producción)

Síntoma observado:

- el usuario completaba el flujo Google OAuth sin error visible;
- Supabase redirigía a `/auth/login/#access_token=eyJ...` con el token JWT completo en el hash;
- la página de login no procesaba nada y devolvía al usuario al formulario de ingreso sin mensaje.

Causa raíz:

- `@supabase/supabase-js` v2 con `detectSessionInUrl: false` no fuerza automáticamente PKCE;
- sin `flowType: "pkce"` explícito, la biblioteca usa implicit flow;
- en implicit flow, Supabase devuelve `#access_token=...` en el hash en lugar de `?code=...` en la query string;
- `AuthCallbackHandler` busca `code` en la URL y no lo encuentra → no llama `exchangeCodeForSession` → sesión nunca creada;
- `detectSessionInUrl: false` impide además que el cliente procese el hash automáticamente.

Corrección aplicada:

Se agregó `flowType: "pkce"` en la creación del cliente en [lib/supabase/client.ts](lib/supabase/client.ts). Con PKCE activo, Supabase redirige con `?code=...` en la query string, que `AuthCallbackHandler` sí captura y procesa correctamente con `exchangeCodeForSession(code)`.

Regla derivada:

- `flowType: "pkce"` y `detectSessionInUrl: false` deben coexistir en el cliente;
- `detectSessionInUrl: false` evita el procesamiento automático del hash (necesario para control manual del flujo);
- `flowType: "pkce"` garantiza que Supabase use el flujo correcto y devuelva un código intercambiable, no un token directo.

### Evaluación general

El login quedó reducido a un flujo Google-only y la superficie cliente ahora es más consistente con el modelo operativo declarado. El riesgo principal ya no es código residual, sino asegurar que la autorización posterior al login aplique validaciones duras sobre dominio y perfiles habilitados. La interfaz es razonable, pero no debe tratarse como frontera suficiente de seguridad por sí sola.

### Recomendaciones priorizadas

1. Validar dominio institucional del usuario autenticado en backend, no solo en la UI.
2. Confirmar periódicamente que `get_current_portal_scope()` solo conceda acceso a correos presentes en la política operativa esperada.
3. Si se requiere auditoría más fuerte, enviar errores auth a observabilidad centralizada además de toast y consola.

### Resumen ejecutivo

La página de login quedó alineada con el uso real del portal: acceso solo por Google, con error visible ante fallos de OAuth y con autorización efectiva atada al acceso real cargado en la base del portal. La operación cliente es más predecible y ya no concede acceso implícito por bootstrap durante el ingreso.
