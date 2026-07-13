# Contexto del Módulo: Landing Pública y Páginas Legales

> **Última actualización:** 2026-07-13
> **Alcance:** landing pública en `/`, páginas legales (`/terminos/`, `/privacidad/`, `/cookies/`) y su integración con el guard de rutas del portal.
> **Documentos relacionados:** `context.md` (raíz), `docs/contexto-general.md`, `docs/seguridad.md`, `docs/README.md`.

---

## 1. Propósito

La landing cumple un doble objetivo:

1. **Difusión ciudadana:** explicar a cualquier persona qué es un Consejo Escolar, quiénes lo integran, qué funciones tiene, cuál es su normativa y dónde encontrar recursos y videos.
2. **Puerta de entrada al portal:** presentar el Portal Consejos Escolares (programación, actas, métricas, gestión territorial) con acceso visible al login institucional.

Es contenido **100% estático e informativo**: no consulta Supabase y no requiere sesión. Desde el 2026-07-02 muestra al inicio una **modal central de privacidad/cookies**, exige marcar `He leído y acepto` antes de continuar y guarda solo una preferencia técnica mínima para recordar esa aceptación en la landing.

---

## 2. Rutas públicas

| Ruta | Contenido | Página |
|---|---|---|
| `/` | Landing pública completa | `app/page.tsx` → `LandingPage` |
| `/terminos/` | Términos y Condiciones | `app/terminos/page.tsx` |
| `/privacidad/` | Política de Privacidad | `app/privacidad/page.tsx` |
| `/cookies/` | Política de Cookies | `app/cookies/page.tsx` |
| `/auth/login/` | Login + callback OAuth (preexistente) | `app/auth/login/page.tsx` |

### Integración con el guard de rutas

`components/portal/app-frame.tsx` define `isPublicRoute` = landing + login + rutas legales:

- Rutas públicas se renderizan **siempre**, con o sin sesión (un usuario logueado también puede ver la landing).
- Rutas protegidas sin sesión redirigen a **`/auth/login/`** (antes redirigían a `/`, que era la pantalla de login).
- El callback OAuth sigue llegando a `/auth/login/` (`resolveAuthRedirectUrl()` en `lib/auth/context.tsx`) — el cambio de `/` no afectó el flujo de autenticación.

**Invariante:** toda nueva página pública debe agregarse explícitamente a `isPublicRoute` en `app-frame.tsx`; de lo contrario el guard la redirige al login.

---

## 3. Archivos del módulo

| Archivo | Rol |
|---|---|
| `components/landing/landing-page.tsx` | Componente principal. Exporta `LandingPage`, `LandingHeader` y `LandingFooter`. También contiene la modal de consentimiento legal/cookies (`ConsentBanner`) y todo el contenido vive en arrays de datos al inicio del archivo (`NAV_LINKS`, `HERO_STATS`, `CARACTER`, `INTEGRANTES`, `MATERIAS_INFORMADAS/CONSULTADAS`, `NORMATIVA`, `ORIENTACIONES`, `SITIOS_OFICIALES`, `VIDEO_EMBED`, `PORTAL_FEATURES`, `LEGAL_LINKS`). |
| `components/landing/legal-page.tsx` | Layout compartido de páginas legales: header/footer de la landing + tarjeta artículo (patrón DS 5.12) con miga de pan, título, bajada y fecha de actualización. |
| `app/page.tsx` | Monta `LandingPage`. |
| `app/terminos/page.tsx`, `app/privacidad/page.tsx`, `app/cookies/page.tsx` | Contenido legal como server components con `metadata` propia, envueltos en `LegalPage`. |
| `app/globals.css` | Estilos `.legal-article` (tipografía de contenido legal con tokens DS) y `html:has(#landing-root)` para scroll suave solo en la landing. |

---

## 4. Estructura de la landing

Secciones en orden, con sus anchors:

1. **Masthead sticky** (3 capas DS): utility bar (Gobierno de Chile · Mineduc), brand bar con logo, nav primaria con links de ancla y **botón "Acceder al Portal"** (ícono `LogIn` → `/auth/login/`). Menú hamburguesa < `lg`.
2. **Modal central de consentimiento**: overlay bloqueante con enlaces a `/privacidad/` y `/cookies/`, checkbox obligatorio `He leído y acepto` y botón `Aceptar y continuar` deshabilitado hasta marcar la casilla.
3. **Hero** (`bg-grad-hero` + anillo coral decorativo): H1, bajada, CTAs y 4 stats.
4. `#que-es` — qué es un consejo escolar + 4 tarjetas de carácter (informativo / consultivo / propositivo / resolutivo).
5. `#integrantes` — 6 estamentos (director, sostenedor, docente, asistente de la educación, estudiantes, apoderados).
6. `#funciones` — dos columnas: materias informadas (6 ítems, incluye la cláusula abierta "otras materias relacionadas con la gestión educativa") / materias consultadas.
7. `#normativa` — enlaces a Ley Chile (BCN): Ley 19.979, Decreto 24/2005 (`idNorma=236237`), Ley 20.845, LGE 20.370, Ley 21.040, **Ley 21.809** (convivencia, buen trato y bienestar) y **Ley 21.819** (fortalece la gestión de la educación pública, modifica la 21.040).
8. `#recursos` — orientaciones prácticas + sitios oficiales (Mineduc, Supereduc, Agencia de Calidad, BCN).
9. `#videos` — un único video institucional incrustado vía `<iframe>` de YouTube (`VIDEO_EMBED`, `youtube.com/embed/nJX3T2pVN1E`); reemplazó a las 3 tarjetas que enlazaban búsquedas.
10. `#portal` — banda `bg-grad-deep-blue` con las 4 funcionalidades del portal y CTA de acceso.
11. **Footer** navy-700 con navegación, instituciones, acceso al portal y enlaces legales en la barra inferior, que incluye el crédito "Sitio desarrollado por la Subdirección de Gestión Territorial".

Los links del menú y footer usan anchors absolutos (`/#que-es`) para funcionar también desde las páginas legales.

---

## 5. Contenido legal — base normativa

Las tres páginas legales se redactaron según normativa chilena vigente a julio 2026:

- **Ley N° 19.628** — protección de la vida privada.
- **Ley N° 21.719** — nueva ley de protección de datos personales; **entra en plena vigencia en diciembre 2026** y crea la Agencia de Protección de Datos Personales. Las políticas declaran adopción anticipada de sus principios.
- **Ley N° 21.663** — Ley Marco de Ciberseguridad (deberes de seguridad y reporte a ANCI/CSIRT para organismos del Estado).
- **Ley N° 21.459** — delitos informáticos (citada en usos prohibidos de los términos).
- **Ley N° 21.096** (rango constitucional de la protección de datos), **Ley N° 21.180** (transformación digital), **Ley N° 20.285** (transparencia), **Ley N° 17.336** (propiedad intelectual), **Ley N° 21.040** (crea los SLEP).

La **política de cookies documenta el almacenamiento real de la app** (verificado contra `lib/constants.ts` y `lib/supabase/client.ts`):

| Clave | Tipo | Uso |
|---|---|---|
| `consejos.landing.legal-consent.v1` | localStorage | recordar aceptación explícita de la modal de privacidad/cookies en la landing |
| `consejos-portal` | localStorage | token de sesión Supabase (`storageKey` del cliente) |
| `consejos.portal.selected-rbd` | localStorage | escuela seleccionada (admin) |
| `consejos.portal.auth-state.v1` | sessionStorage | caché de perfil/scope |
| `consejos.portal.snapshot.*` | sessionStorage | caché del snapshot del portal |

No hay cookies propias de analítica o publicidad. Google establece cookies en sus dominios durante el OAuth. La landing incorpora una **modal visible y bloqueante de privacidad/cookies** al inicio, con consentimiento explícito mediante checkbox y almacenamiento técnico mínimo para recordar la aceptación; si algún día se agrega analítica, hay que actualizar `/cookies/` y ampliar el mecanismo de consentimiento (Ley 21.719).

**Invariante:** si cambian las claves de `STORAGE_KEYS`, el `storageKey` del cliente Supabase o se agrega cualquier tracking, la tabla de `/cookies/` debe actualizarse en el mismo cambio.

---

## 6. Reglas visuales y gotchas del módulo

1. **Colores a nivel de elemento:** `app/colors_and_type.css` pinta `h1`–`h5` (navy), `p` (neutral-700) y `a` (royal) con selectores de elemento, que **le ganan al color heredado** de un contenedor `text-white`. Sobre fondos oscuros (`bg-grad-*`, `bg-navy-*`) todo `h*`, `p` y `a` debe llevar clase de color explícita (`text-white`, `text-neutral-100/90`, `text-inherit`). Este bug ya ocurrió (hero H1 y banda portal invisibles) — no reintroducirlo.
2. **Export estático:** la landing se ve sin estilos si se abre `out\index.html` vía `file://` (las rutas `/_next/...` son absolutas). Siempre servir por HTTP: `npm run dev` o `npm run preview`.
3. **Design system:** el módulo sigue `INSTRUCCIONES_DISENO.md` del paquete `@slep-colchagua/design-system` — tokens navy/royal/coral/neutral, `rounded-control/card/modal/pill`, sombras navy-tinted, gradientes solo en hero/banners, iconos Lucide.
4. **Scroll:** los anchors usan `scroll-mt-36 md:scroll-mt-48` para compensar el masthead sticky; el scroll suave está scoped vía `html:has(#landing-root)` para no afectar al portal autenticado.
5. Las páginas legales son las únicas que usan la clase `.legal-article`; su tipografía se define en `globals.css`, no inline.
6. **Consentimiento explícito:** la modal legal es client-side y depende de `localStorage`; cualquier refactor del root de la landing debe preservar ese gate antes del contenido. Si cambia el texto o la mecánica del consentimiento, actualizar en el mismo cambio `/cookies/`, `/privacidad/` y este contexto.
7. **Texto justificado (2026-07-13):** todos los bloques de texto corrido del sitio público usan `text-justify` — hero, subtítulos de `SectionHead`, descripciones de tarjetas (carácter, integrantes, normativa, orientaciones, features del portal), listas de funciones, modal de consentimiento y contenido legal (`legal-page.tsx`). Los textos de una línea (labels, stats, links) quedan alineados a la izquierda. Mantener esta convención al agregar contenido nuevo.

---

## 7. Pendientes del módulo

- **Correo de contacto:** las tres páginas legales usan `contacto@slepcolchagua.cl` como canal para derechos ARCO y reporte de incidentes — **confirmar o reemplazar** por el canal oficial del SLEP.
- ~~**Videos:** reemplazar tarjetas por videos institucionales definitivos~~ — **resuelto el 2026-07-13**: se incrusta el video institucional oficial (`VIDEO_EMBED`).
- **URL institucional:** la utility bar enlaza `https://www.slepcolchagua.cl/` — verificar que sea el dominio oficial vigente.
- Revisar contenido legal con asesoría jurídica del servicio antes del despliegue público definitivo.
- Cuando la Ley 21.719 entre en plena vigencia (diciembre 2026), revisar la política de privacidad (referencias a la Agencia de Protección de Datos).

---

## 8. Validación realizada (2026-07-02)

- `npx tsc --noEmit` sin errores.
- `npx eslint` sin errores en los archivos del módulo, incluida la modal de consentimiento.
- `npm run build` exporta `/`, `/terminos/`, `/privacidad/` y `/cookies/` como rutas estáticas.
- Verificado sobre HTTP (`npx serve out`): landing, CSS y páginas legales responden 200 con diseño completo.
