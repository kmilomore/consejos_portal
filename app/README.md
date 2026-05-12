# SLEP Colchagua · Design System

**Servicio Local de Educación Pública Colchagua** — sistema de diseño institucional para el servicio público encargado de administrar los establecimientos educacionales fiscales del territorio de Colchagua (Región de O'Higgins, Chile), creado en el marco de la Ley 21.040 de Nueva Educación Pública.

This design system codifies the brand into reusable typography, color, spacing, iconography, and component primitives so any team — institutional, communications, or platform — can produce on-brand artifacts quickly and consistently.

---

## Sources & inputs

This system was built from the brief and assets provided by the user:

- **Brand color spec** (Pantone-anchored): Navy `#25306B` (2756C), Royal `#006BB9` (2175C), Coral `#FF1D3D` (1788C), Soft White `#EDF0F5` (663C).
- **Gradient & usage guidance** for institutional/education sector design.
- **Logo file**: `uploads/SLEPCOLCHAGUA.webp` — circular institutional badge (coral ring, royal blue field, white star, white wordmark, dashed brushstroke underline echoing the Chilean flag motif).
- **Type files**: Museo Sans `100 / 500 / 700 / 900` (`.woff`).

No codebase, Figma file, deck template, or live product was provided. The component library, slide samples, and UI kit screens are therefore **derived from the brand guidelines + institutional/government-education conventions** rather than reverse-engineered from existing product. Flag this if any team artifact contradicts what's here — we will align to the existing artifact.

---

## Index — manifest of the root folder

| File / folder              | What's in it                                                                 |
| -------------------------- | ---------------------------------------------------------------------------- |
| `README.md`                | This file. Brand context, content fundamentals, visual foundations, iconography. |
| `colors_and_type.css`      | Single source of truth — CSS custom properties for color, type, spacing, shadow, radius, motion. |
| `globals.css`              | App-level layer for Tailwind directives and portal-specific global rules such as print and motion helpers. |
| `SKILL.md`                 | Agent-Skills metadata, so this system can be downloaded and used by Claude Code. |
| `fonts/`                   | `MuseoSans-100/500/700/900.woff` web fonts.                                  |
| `assets/`                  | Brand assets — logo (master + monochrome), favicon, badge marks, illustrative imagery placeholders. |
| `preview/`                 | The Design System tab cards — one HTML file per token group / component cluster. |
| `ui_kits/sitio-publico/`   | Interactive recreation of the institutional public website (homepage, news, about, services). |
| `ui_kits/`                 | Each sub-folder is one product surface (README + index.html + JSX components). |

---

## What is a SLEP?

A **Servicio Local de Educación Pública (SLEP)** is a decentralized public service that runs all state-run schools and kindergartens in a defined Chilean territory. SLEP Colchagua administers **68 establecimientos educacionales** distributed across **4 comunas** of the Colchagua territory. Communications must read as **institutional, formal, and welcoming** — the audience is families, teachers, school directors, municipal authorities, and the general public.

---

## 🪶 CONTENT FUNDAMENTALS — How copy is written

### Voice & tone

The brand voice is **institutional, formal, warm, and unambiguous** — the cadence of a public service that wants to be both authoritative and accessible to families. It is the cadence of a circular, a *resolución*, a press release — softened by an explicit pedagogical mission.

- **Language**: Spanish (Chile). Use **inclusive plurals** (*estudiantes, comunidades educativas, trabajadores y trabajadoras de la educación*). Avoid "@" or "x" gender forms; prefer doubled forms or collective nouns.
- **Casing**: Title Case is **not** used the way it is in English. Headlines are written in sentence case, except for proper nouns and the institution's own name. The wordmark itself appears in **ALL CAPS** ("SERVICIO LOCAL DE EDUCACIÓN PÚBLICA COLCHAGUA") — that's a logo treatment, not a copy rule.
- **Person**: Mixed but biased toward the **third person** for official notices ("el Servicio Local informa…"), shifting to **second person plural / formal usted** when speaking directly to families and school communities ("le invitamos a participar…"). Internal-facing content can use **nosotros / nosotras** ("estamos trabajando para…").
- **Tense**: Present and near-future. Avoid the conditional unless conveying genuine uncertainty.
- **Emoji**: **Not used** in institutional copy. Iconography handles the visual cueing. (Social media posts may use them sparingly, but never in headlines, navigation, buttons, or formal documents.)
- **Acronyms**: Always spelled out on first use, then abbreviated: *Servicio Local de Educación Pública (SLEP) Colchagua*. Common ones in-context: **DEP** (Dirección de Educación Pública), **MINEDUC**, **PADEM**, **PEI**, **CRA**.
- **Numbers**: Spanish convention — `1.234` thousands, `1,5` decimals. Percentages with a space: `45 %`. Dates as `12 de marzo de 2026`.

### Example copy (institutional)

> **Bienvenidos al Servicio Local de Educación Pública de Colchagua**
>
> Somos el organismo público encargado de administrar los jardines infantiles, escuelas y liceos públicos del territorio de Colchagua. Trabajamos junto a comunidades educativas, familias y autoridades locales para garantizar una educación pública de calidad, gratuita, inclusiva y pertinente a nuestro territorio.

### Example copy (call to action / form)

> **Postula tu hijo o hija al sistema escolar 2026.**
> El proceso de admisión es 100 % en línea, gratuito y se realiza a través del Sistema de Admisión Escolar (SAE).
>
> `[ Iniciar postulación ]`  `[ Conocer los plazos ]`

### Microcopy patterns

- Buttons use a **verb + object** in infinitive or imperative: *Iniciar postulación*, *Descargar resolución*, *Conocer el plan*. Avoid bare *Click aquí*.
- Empty states are explanatory, never cute: *Aún no hay comunicados publicados en esta categoría.*
- Error messages name the field and the fix: *El RUT ingresado no es válido. Revise el formato 12.345.678-9.*

### Vibe

Confident but never boastful. The brand earns trust by being **clear, consistent, and on time** — not by being clever.

---

## 🎨 VISUAL FOUNDATIONS

### Color — the institutional palette

Four anchor colors. Use them in a strict hierarchy:

| Token            | Hex       | Pantone | Role                                                              |
| ---------------- | --------- | ------- | ----------------------------------------------------------------- |
| Navy blue        | `#25306B` | 2756 C  | Dominant structural color — headers, footers, dark backgrounds, primary text on light. |
| Royal blue       | `#006BB9` | 2175 C  | Interactive — links, primary CTAs, focus rings, highlight pills.  |
| Coral red        | `#FF1D3D` | 1788 C  | Emphasis & alerts — used sparingly. Logo ring, danger states, key callouts. |
| Soft white       | `#EDF0F5` | 663 C   | Page backgrounds, negative space, dividers on dark surfaces.      |

**Hierarchy rule of thumb**: a screen should read ~60 % soft white, ~25 % navy, ~10 % royal, ~5 % coral. Coral is the loudest color in the system — when it appears, it should mean something.

**Gradients** are part of the brand language, not decorative noise. They belong on hero sections, cover slides, and institutional title cards. Three approved gradients:

- **Navy gradient** `#25306B → #2C3D9E` — most common, default for institutional headers.
- **Deep blue gradient** `#25306B → #006BB9` — for hero blocks and feature highlights.
- **Red fade** `#FF1D3D → #EDF0F5` — accent treatment for emphasis blocks, used sparingly.

Always prefer the gradients over flat fills for **hero sections and covers**. Flat fills are appropriate for cards, panels, navigation chrome, and any surface where text legibility is paramount.

**Text-on-color**: on dark fills (navy, royal), text is `#FFFFFF` or `#EDF0F5`. On light fills, text is `#25306B` (never pure black — the system has no pure black for body text).

### Typography — Museo Sans, top to bottom

The wordmark and all institutional typography is set in **Museo Sans**. It's geometric, slightly humanist, with generous x-height — a friendly counterweight to the formality of the navy/coral combination.

- **Weights in use**: `100` (delicate display only — use ≥ 40 px), `500` (working "regular" for body), `700` (subheads, UI labels, buttons), `900` (display headlines, the wordmark itself).
- **Display headlines** are set in `900` with tight tracking (`-0.02em`) and short leading (`1.1`). Headlines are usually two to four words; longer headlines drop to `700`.
- **Body** is `500` at 16 px / 1.5 line-height. The `400` slot maps to `500` in our system — there is no `400` cut of Museo Sans included.
- **Eyebrows / overlines** are 12 px `700`, ALL CAPS, tracked out `0.12em`, set in royal blue. They label sections, never headlines.
- **Numbers** are tabular when used in tables; otherwise the default proportional figures are fine.

Substitution: when Museo Sans isn't available (rare on third-party sites, embeds), fall back to *Avenir Next → Segoe UI → Helvetica Neue → Arial*. Do **not** substitute Inter, Roboto, or Open Sans — they read distinctly more "tech startup" than "public institution."

### Spacing — 4-point grid

All spacing is a multiple of **4 px**. Component padding starts at 8/12/16 px; section padding starts at 48/64/96 px. Touch targets minimum **44×44 px**.

### Layout & containers

- Standard content max-width: **1200 px** (`--container-lg`).
- Long-form prose column: 640–720 px.
- Government-site convention: a **utility strip** sits above the main header (small links: *Contacto · Transparencia · Denuncias*).
- The header itself is dominant navy or a navy gradient with the badge logo top-left and primary nav inline.

### Backgrounds & imagery

- **Soft white pages** are the default. Cards float on this background with light shadows.
- **Navy or gradient hero blocks** anchor section starts and landing pages.
- **Imagery** — photography of real school communities. **Warm, naturally-lit, candid**. No stock-photo-perfect smiles, no cool desaturated corporate filters. When tinted, tint with a navy `40-60 % opacity overlay` to preserve legibility and brand cohesion.
- **No hand-drawn illustrations.** No bluish-purple gradients. No emoji on top of imagery.
- **Patterns**: a subtle motif derived from the logo's dashed-brushstroke underline can be used as a divider or as a watermark element on covers — never as a busy repeating background.

### Borders & dividers

- Default border: `1px solid #DDE3EC` (`--border-1`).
- Dividers between sections on dark backgrounds use `1px solid rgba(255,255,255,0.12)`.
- The **brand accent border** — a 4 px coral or navy underline — is used to mark active nav items, current step in a wizard, or the top edge of a featured card.

### Shadows & elevation

Shadows are **cool, navy-tinted, never neutral gray**. Five tiers:

- `--shadow-xs` — input fields, default state of small chips.
- `--shadow-sm` — cards at rest.
- `--shadow-md` — cards on hover, popovers.
- `--shadow-lg` — modals, sticky toolbars when scrolled.
- `--shadow-xl` — full-page overlays, lightboxes.

Focus state always uses `--shadow-focus` (`0 0 0 3px rgba(0,107,185,0.35)`) — never a browser default outline.

Inset shadows (`--shadow-inset`) are used on dark-fill buttons to give them a top-edge highlight (`inset 0 1px 0 rgba(255,255,255,0.10)`).

### Corner radii

- **Controls / buttons**: 8 px (`--radius-control`).
- **Cards**: 12 px (`--radius-card`).
- **Modals & large surfaces**: 20 px.
- **Pills / status chips / avatars**: fully rounded (`--radius-pill`).
- **Inputs**: 8 px to match buttons.

The institutional voice means **no extreme rounding**. Cards never go above 16 px; aggressive 24–32 px rounding reads consumer-app, not public-service.

### Motion — restrained and purposeful

- Standard easing: `cubic-bezier(0.2, 0.6, 0.2, 1)` — the workhorse for hover, focus, panel slides.
- Emphasis easing: `cubic-bezier(0.16, 1, 0.3, 1)` — entry of hero elements, modals.
- Durations: **120 ms** (hover/focus tints), **200 ms** (panels, dropdowns), **360 ms** (modal entry, page-transition fades).
- **No bounce.** No spring overshoots. No marquee scrolls, no parallax of foreground content. A government audience needs to trust the interface; flashy motion erodes that.

### Hover & press states

- **Buttons (primary, royal fill)**: hover → darken to `--royal-600`; press → darken to `--royal-700` + 1 px down-shift via translate, no scale.
- **Buttons (secondary, navy outline)**: hover → fill becomes `--navy-50`; press → `--navy-100`.
- **Buttons (ghost / text)**: hover → underline + `--navy-700` color; no fill.
- **Links**: hover → color shifts from `--royal-500` to `--royal-700`; underline stays.
- **Cards (clickable)**: hover → shadow steps up from `sm` to `md` + 1 px translate up; press → returns to `sm`.
- **Disabled**: 40 % opacity, `cursor: not-allowed`, no hover response.

### Transparency & blur

Used sparingly:

- **Image overlays**: navy at 40–60 % opacity over photography to enable white text.
- **Sticky headers** on scroll: solid navy, **not** translucent. Government sites should not feel "floaty."
- **Modal backdrops**: `rgba(11, 18, 44, 0.55)` — navy-tinted, no blur (or a maximum of `2 px` blur on capable browsers).

### Cards

The canonical card:

- 12 px radius.
- 1 px border `--border-1` **or** `--shadow-sm` (choose one — don't double up).
- 24 px internal padding.
- Optional 4 px top accent stripe in navy, royal, or coral for categorization.
- White surface on the soft-white page.

### Fixed elements & layout rules

- The masthead is **fixed only on scroll past 64 px**, and only on the public site. Inside the platform/admin areas, the masthead is static.
- The skip-to-content link is **always present**, visually hidden until focused.
- Accessibility: all interactive elements have a visible focus ring; color contrast meets WCAG AA at minimum.

---

## 🔣 ICONOGRAPHY

### Approach

SLEP Colchagua does **not** ship a custom proprietary icon set. The institutional context calls for an icon style that is **outline-first, 2 px stroke, rounded joints**, friendly without being cartoonish.

**Recommended set**: [**Lucide**](https://lucide.dev) — open source, 1,500+ glyphs, consistent 24 × 24 grid, 2 px stroke that pairs cleanly with Museo Sans. Load from CDN:

```html
<script src="https://unpkg.com/lucide@latest"></script>
<i data-lucide="graduation-cap"></i>
```

When a glyph needs to be inlined (PDF, slide deck, asset that must work offline), copy the SVG out of Lucide's source and into `assets/icons/`. Color them via `currentColor` so they inherit text color.

### Color rules for icons

- Default: `currentColor` — picks up the text color of its parent.
- Inside primary buttons (royal fill): `#FFFFFF`.
- Decorative icons in feature blocks: **royal blue** `#006BB9` on a `--royal-50` rounded square (40–56 px), navy-stroked is acceptable for monochrome contexts.
- Coral icons are reserved for **alerts and emphasis** — error states, urgent notices, the active step in a wizard.

### Logo & badge marks

- **`assets/logo-slep-colchagua.webp`** — the master institutional badge. Circular, coral ring around royal blue field, white star, white wordmark in Museo Sans 900, dashed underline. Use this on white or soft-white backgrounds. For dark backgrounds, the badge holds up because the field is already royal blue — but ensure 24 px of clear space around it.
- **Clear space**: minimum half the badge's diameter on all sides.
- **Minimum size**: 48 px web / 12 mm print. Below that, switch to a stacked or horizontal wordmark variant (to be commissioned if needed — currently only the circular master mark is provided).
- **Never** distort, recolor, place on a busy photographic background without an overlay, add drop shadow, or remove the star.

### Unicode characters as icons

Avoid using arrows `→`, checks `✓`, bullets `•` from system fonts inside buttons or headings — they render inconsistently across OSs. Use Lucide equivalents (`arrow-right`, `check`, `circle`) instead.

### Emoji

Not used in institutional UI, official documents, or formal communications. Allowed in social-media-only copy when culturally appropriate, never in core platform UI.

---

## How to use this system

1. Link `colors_and_type.css` from any project that needs the shared token and typography contract.
2. In this Next.js portal, keep `colors_and_type.css` as the shared base and reserve `globals.css` for Tailwind plus portal-only global rules.
3. Load Museo Sans through `next/font/local` and expose the variable on `html` so root-level tokens like `--font-sans` can resolve correctly.
4. Reference `fonts/` for the four Museo Sans cuts when working outside the portal runtime.
5. Pull components from `ui_kits/<surface>/`.
6. When generating slides or one-off artifacts, copy assets out of `assets/` rather than re-drawing them.
7. Treat the tokens (CSS custom properties) as the contract — never hard-code hex values inside a component.

---

## Caveats & open questions

- **Logo set is partial.** Only the circular master mark was provided. A **horizontal/stacked wordmark** and a **monochrome-on-dark** variant would round out the kit; ask the brand owner.
- **No codebase or Figma was provided.** The UI kit is a *plausible interpretation* of a Chilean public-service institutional website, not a recreation of a specific live product. Share the production URL or repo and the kit will be re-aligned.
- **Photography library is referenced but not provided.** Image slots in the UI kit are placeholders. Provide a real photo set to swap in.
- **Icon set is a CDN substitution (Lucide).** If SLEP Colchagua has internal preferences (Material Symbols, Phosphor, a custom set), point us at them.
