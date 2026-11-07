# Sistema visual y apariencia profesional

**Actualizado:** 2026-11-06
**Hoja de estilos:** `public/styles/app.css` (única, sin estilos en línea)
**Marcado:** `indexInicial.html` (solo estructura, sin `<style>` ni `<script>` en línea)

Este documento describe la identidad visual del SPA, su arquitectura de estilos y
los pulidos de acabado aplicados para que la interfaz se perciba profesional.
Es complementario de `docs/arquitectura-frontend.md` (que cubre estructura,
orden de carga y pruebas).

## 1. Identidad visual

| Token | Valor | Uso |
| --- | --- | --- |
| `--secondary` / navy | `#14284B` | Marca, títulos, fondos oscuros (navbar, héroe, footer) |
| `--secondary-light` / blue | `#2563EB` | Acciones primarias, enlaces, acentos |
| `--primary` / teal | `#0D9488` | Éxito, progreso, acentos secundarios |
| `--primary-dark` | `#0F766E` | Hover/activo del teal |
| `--accent-soft` | `#CCFBF1` | Fondos suaves de éxito |

Tipografía: **Inter** (300–900, Google Fonts) con *system-ui* como respaldo.
Los títulos usan peso 700–900, *letter-spacing* negativo y `text-wrap: balance`.

Las pruebas fijan esta identidad: `tests/ui-design.test.js` exige los colores
`#14284B`, `#2563EB` y `#0D9488`, y `tests/spa-modular.test.js` exige que el CSS
conserve `--` (variables) y `#14284b` y supere 90 KB.

## 2. Arquitectura del CSS

El archivo tiene tres capas, en orden:

1. **Base** (variables `:root`, reset, utilidades, animaciones): tokens de color,
   sombra (`--shadow-xs` a `--shadow-glow`), radio (`--r-sm` a `--r-pill`) y
   transición (`--t`).
2. **Componentes** (navbar, botones, hero, tarjetas, dashboard, lección legacy).
3. **Refinamiento 2.0** (a partir de ~la mitad del archivo): reajusta los mismos
   selectores con la paleta definitiva, radios de 1rem, sombras suaves y
   espaciados consistentes. Es la capa que manda.
4. **Sistema `.lx-`** (curso, módulo y lección): componentes reutilizables sin
   dependencias externas (`lx-hero`, `lx-panel`, `lx-path`, `lx-reading`,
   `lx-quiz`, `lx-outline`, callouts tipados, tablas, figuras, bibliografía).

La cascada se mantiene por **especificidad igual + orden**: no se usa
`!important` salvo en los resets de `prefers-reduced-motion`.

## 3. Componentes con acabado profesional

- **Navbar**: sticky con `backdrop-filter: blur`, borde inferior sutil y enlaces
  con subrayado animado (`::after`).
- **Botones** (`.btn`, `.btn-primary`, `.btn-secondary`, `.btn-outline`,
  `.btn-ghost`): altura mínima de 44px (táctil), radio 0.75rem, peso 700,
  transición de color/sombra/transform y `:focus-visible` con outline teal.
- **Tarjetas** (`.feature-card`, `.area-card`, `.module-card`, `.dash-stat`):
  borde 1px, radio 1rem, sombra suave y *hover lift* con `translateY`.
- **Lectura de lección** (`.lx-reading`): ancho de lectura 74ch, `line-height`
  1.78, jerarquía de títulos, callouts tipados (`key`, `example`, `case`,
  `reflection`, `activity`) y tablas responsivas con scroll horizontal.

## 4. Accesibilidad y movimiento

- Foco visible global: `:where(a, button, input, select, textarea, summary):focus-visible`
  con outline teal de 3px.
- `skip-link` al `main#mainContent`; navbar y modales con `aria-label`/`role`.
- Contraste verificado por `tests/ui-design.test.js` para las acciones principales.
- `prefers-reduced-motion: reduce` neutraliza animaciones y transiciones.

## 5. Responsive

Puntos de quiebre: `1080px`, `992px`, `768px`, `600px`, `540px`, `480px`.
La experiencia de aprendizaje (`.lx-`) colapsa el índice lateral por debajo de
`1080px` y apila todo a `540px`. El menú móvil convierte `.nav-links` en una
fila deslizable horizontal.

## 6. Pulido profesional (2026-11-06)

Al cierre de la sesión de diseño se añadió un bloque al final del CSS:

- `::selection` con el teal de marca (fondo suave, texto oscuro).
- `text-rendering: optimizeLegibility` en `body`.
- `img { max-width: 100%; height: auto; }` defensivo.
- `text-wrap: balance` en los títulos de héroe, secciones y lecciones.
- Feedback táctil `.btn:active` (`translateY(1px) scale(.99)` + sombra reducida).
- Scrollbar sutil acorde a la paleta (`scrollbar-width: thin` + WebKit).

Ninguno de estos cambios toca selectores verificados por las pruebas; se
validaron con `tests/ui-design.test.js`, `tests/spa-modular.test.js`,
`tests/spa-ui.test.js` y `tests/learning-experience.test.js` (31 pruebas).

## 7. Cómo validar un cambio de diseño

```bash
npm start                                   # o npm run dev
npx jest tests/ui-design.test.js tests/spa-modular.test.js tests/spa-ui.test.js
```

Reglas que no se deben romper: mantener los tres colores de identidad, los
media queries `768px`/`540px`, `prefers-reduced-motion`, el contraste de las
acciones principales y no reintroducir `<style>`/`<script>` en línea.
