# Handoff: Nube Studio — Sitio web (homepage con animaciones de scroll)

## Overview
Sitio de un estudio de arquitectura japonés. Es una sola página con narrativa
continua controlada por scroll: recorrido fotográfico → declaración del estudio →
nube que se expande hasta cubrir la pantalla → grilla de proyectos → puertas que se
abren → secuencia de objetos sobre negro. Todo el contenido está en **español**.

## About the Design Files
Los archivos de este paquete son **referencias de diseño hechas en HTML/JSX
in-browser** (React + Babel + GSAP ScrollTrigger cargados por CDN). No son código de
producción. La tarea es **recrear estos diseños en el entorno real del proyecto**
(recomendado: Next.js o Vite + React, con GSAP ScrollTrigger o Framer Motion +
`useScroll`), usando los patrones del codebase. Si no existe codebase, elegir el
framework y construir desde cero siguiendo esta especificación.

Notas técnicas del prototipo que **no** deben trasladarse tal cual:
- Los componentes se exponen en `window.*` porque cada `<script type="text/babel">`
  tiene su propio scope. En producción usar imports normales.
- Las rutas de assets son relativas (`../../assets/...`). Reorganizar según el proyecto.
- Los valores de progreso están inline en el render. En producción conviene extraer
  las curvas a helpers puros y testeables.

## Fidelity
**Alta fidelidad.** Colores, tipografía, espaciado, tiempos y curvas de easing son
finales. Las imágenes son placeholders (fotos y objetos de ejemplo): la estructura y
el movimiento son definitivos, el contenido visual no.

---

## Estructura de la página

Orden en el DOM (`Homepage`):
1. `<Tour />` — recorrido de 120 frames, pinned.
2. `<Statement />` — pinned, contiene TODO el resto: nube, proyectos, puertas y objetos.

`<Nav />` está fuera del flujo, fijo arriba.
`<Contact />`, `<Footer />` y `<ProjectDetail />` existen como vistas aparte.

---

## 1. Nav

- Fija arriba, **fondo totalmente transparente**, sin borde ni blur. Solo cambia el color del texto.
- Altura visual ~80px; padding lateral `var(--space-6)`; logotipo 22px.
- Enlaces: `Proyectos`, `Estudio`, `Contacto`. Tipografía `--font-sans`, `--fs-caption`,
  uppercase, `letter-spacing: var(--tracking-caps)`.
- Modos (calculados leyendo `getBoundingClientRect()` de las secciones marcadas
  `[data-hero]`, `[data-statement]`, `[data-objects]` respecto a `y = 80`):
  - `hero` → texto blanco
  - `light` → texto `--text-primary`
  - `dark` → texto blanco (sobre el negro de la nube y la sección de objetos)
  - `hidden` → `opacity: 0`, se retira mientras el panel blanco de la declaración ocupa la pantalla
- **Regla clave de transición:** mientras está oculta, el color se fuerza a blanco y la
  transición de color se desactiva (`transition: none`). Así reaparece ya en blanco sobre
  el negro de la nube y nunca se ve el color anterior contra el blanco.
- Fade: `opacity var(--dur-base) var(--ease-standard)`.

## 2. Tour (recorrido)

- Secuencia de 120 WebP (`assets/tour/frames/frame_001.webp` … `frame_120.webp`), precargados
  con contador visible: `Cargando recorrido · N%`.
- Pinned con ScrollTrigger, `scrub: true`. El frame se elige por `Math.round(progress * 119)`.
- Los frames pasan de color a escala de grises según el progreso (`filter: grayscale()`).
- Overlay: título `Arquitectura / en aire quieto` (`--fs-hero`, `--font-display`, uppercase),
  bajada en `--fs-body-lg`, y caption `Residencia Voladizo · Recorrido`.
- Anotaciones que aparecen y desaparecen en puntos definidos del progreso, con etiqueta y nota:
  `El volumen`, `El giro`, `Cumbrera`, `Voladizo`, `El umbral`, `Cubierta`, `Sala`, `Terraza`.
  Texto exacto en `Tour.jsx`.

## 3. Statement — la escena larga

Un único `ScrollTrigger`:

```
trigger: sección, start: 'bottom bottom', end: '+=1420%',
pin: true, pinSpacing: true, scrub: true
```

La sección tiene `margin-top: -100vh` y `z-index: 2`, de modo que sube por encima del
pin del tour antes de fijarse.

El progreso crudo `raw` (0→1) se reparte en dos tramos:

```js
const p    = clamp(raw / 0.44);          // nube + proyectos + puertas
const objP = clamp((raw - 0.415) / 0.585); // secuencia de objetos
```

Easing usado en toda la escena: `ease(t) = t*t*(3-2*t)` (smoothstep).
`clamp(v) = min(1, max(0, v))`.

### 3a. Texto de la declaración
Centrado, `max-width: 760px`, `padding-bottom: 38vh`:
- Kicker `El estudio` — `--fs-caption`, uppercase, `--tracking-caps`, color `--blue-500`
- Titular `Trabajamos despacio, con luz natural y pocos materiales.` — `--font-display`,
  `--fs-h1`, `--lh-display`
- Bajada `Casas y pequeños edificios públicos en Japón, dibujados a mano antes de dibujarse a máquina.`
  — `--fs-body-lg`, `--text-secondary`, `max-width: 460px`

Sale con `textOut = clamp((p - 0.14) / 0.09)`: `opacity: 1 - textOut`,
`translateY(textOut * -28px)`.

Indicador `Desliza` abajo, centrado, desaparece con `clamp(p / 0.05)`.

### 3b. Órbita de la nube
- Marca: `assets/brand/cloud.svg`, aspect ratio **1.537**, tamaño en reposo **132px** de ancho.
- Recorre una elipse en sentido antihorario alrededor del texto:
  - centro `cx = vp.w * 0.5`, `cy = vp.h * 0.42`
  - `rx = clamp(vp.w * 0.44, min 80, max vp.w/2 - pad)`, `ry` análogo con `vp.h * 0.34`
  - `pad = 132 * 0.85` (para que la diagonal rotada no se recorte)
  - posición: `x = cx + rx*sin(a)`, `y = cy + ry*cos(a)`
- `lap = ease(clamp((p - 0.05) / 0.21))`; `angle = lap * 2π * 0.62` → **0.62 de vuelta**, no una completa.
- Rotación propia: `spin = -360 * ease(clamp((p - 0.05) / 0.20))`.

### 3c. Bocanadas de propulsión (40 piezas)
- Forma: `assets/brand/cloud-line.svg` (aspect **1.517**), relleno blanco con contorno negro.
- Nacen desde la cola: posición del ángulo `angle - 0.17 - life*0.5`.
- Jitter determinista: `rnd(i, s) = frac(sin((i+1)*12.9898 + s*78.233) * 43758.5453)`.
- Cada una vive `gap * (2.6 + rnd(i,1)*1.8)` donde `gap = 2π*0.62/40`, así siempre hay 3–4 visibles.
- Ancho `132 * (0.14 + rnd(i,5)*0.16) * (0.8 + 0.5*life)`; desplazamiento lateral
  `(rnd(i,4)-0.5) * 30 * (0.3+life)` perpendicular a la tangente.
- Opacidad `min(1, life/0.14) * (1-life) * (0.8 + rnd(i,6)*0.2) * trailOn`, donde
  `trailOn = min(clamp(lap/0.06), clamp((1-lap)/0.10)) * (1 - clamp(open/0.12))`.

### 3d. Zoom de la nube
- `open = clamp((p - 0.17) / 0.20)`.
- Mientras crece se recentra: `centre = ease(clamp(open / 0.4))`, la posición interpola
  hacia el centro exacto del viewport.
- Escala exponencial: `size = 132 * (cover/132)^open` con `cover = max(vp.w, vp.h*1.537) * 12`
  (la nube tiene espirales abiertas; hay que pasarse mucho del viewport para tapar las esquinas).
- Implementación: una capa negra a pantalla completa con `mask-image: url(cloud.svg)`,
  `mask-size: {size}px auto`, `mask-position` centrada en `(mx, my)`, y
  `transform: rotate(spin)` con `transform-origin` en `(mx, my)`.
- Capa negra de respaldo detrás: `solid = clamp((p - 0.31) / 0.05)` — opaca antes de que
  llegue el primer proyecto, para evitar destellos por los huecos de la máscara.

### 3e. Grilla de proyectos (dentro de la máscara)
- `display: grid`, `grid-template-columns: repeat(4, 1fr)`, una fila, `gap: var(--space-5)`,
  `padding: var(--space-6)`, `padding-top: 96px` (para no quedar bajo la nav).
- Contenedor con `perspective: 1800px`, `perspective-origin: 50% 50%`.
- Entrada: `inner = clamp((p - 0.34) / 0.48)`, un panel por vez de izquierda a derecha
  (`seg = 1/4`, `t = ease(clamp((inner - i*seg) / seg))`), cada uno entra desde la derecha
  con `translateX((1-t) * (vp.w + 40))`.
- Contenido por celda:
  - `<img>` `object-fit: cover`, `grayscale(1) contrast(1.04)`
  - Hover: `brightness(0.6)` + `scale(1.04)`, transición 620/900ms `--ease-standard`
  - Hover: etiqueta abajo-izquierda con el título y la ciudad en `--blue-500`
  - Hover: dibujo de líneas (volumen axonométrico, SVG `viewBox 0 0 120 120`, `stroke: white`,
    `stroke-width 0.7`, `vector-effect: non-scaling-stroke`) revelado con
    `clip-path: inset(0 0 100% 0) → inset(0)`, 760ms. Coordenadas en `WIRE` (Homepage.jsx).
- Proyectos: `Casa Escalera Vertical / Kioto`, `Residencia Voladizo / Nara`,
  `Pabellón a Media Altura / Kobe`, `Estudio en Hormigón Gris / Osaka`.

### 3f. Las puertas
Los cuatro paneles se comportan como **dos bloques** (los dos de la izquierda y los dos
de la derecha) que giran como las paredes de un edificio y se retiran por los costados,
**sin bajar**, abriendo el centro:

```js
const door = ease(clamp((p - 0.86) / 0.13)); // giro
const away = ease(clamp((p - 0.93) / 0.07)); // salida lateral
const left = i < 2;
transformOrigin: `${[0, -100, 200, 100][i]}% 50%`  // bisagra en el borde exterior del par
rotateY: door * 82 * (left ? -1 : 1)
translateX extra: (door * 6 + away * 130) * (left ? -1 : 1)  // en %
opacity: 1 - away
filter: brightness(1 - door * 0.45)
```

Los `transform-origin` fuera del rango 0–100% son intencionales: hacen que ambos paneles
de un par giren sobre la misma bisagra, como una sola pared.

### 3g. Secuencia de objetos (`Objects.jsx`)
Vive **en la misma pantalla anclada**, en una capa `position: absolute; inset: 0` detrás
de los paneles, con **fondo negro** (`--black`). Recibe `progress={objP}`; el componente
también funciona autónomo (crea su propio pin con `end: '+=520%'`) si se monta sin prop.

Cuatro piezas, `step = 1 / 4.25`, `t = (p - i*step + 0.055) / (step * 1.2)`
(las ventanas se solapan: el texto siguiente empieza a subir mientras el anterior sale).

Por pieza, alternando lado (par → texto a la derecha, impar → texto a la izquierda):

**Texto** — sube en continuo, sin pausas, hasta salir por arriba:
```js
translateY: vp.h * 0.62 - t * (vp.h * 1.30)
opacity: clamp(t/0.06) * clamp((1-t)/0.06)
left: textRight ? '58%' : '8%';  width: 34%
```
Título en `--font-display`, `--fs-h2`, uppercase, color `--white`.
Nota en `--font-sans`, `--fs-body-lg`, color `--grey-300`, `max-width: 380px`.

**Imagen** — entra en horizontal desde el lado opuesto con fade in, queda **quieta**, y
hace fade out **estático en su posición** cuando el texto siguiente empieza a subir:
```js
inT  = ease(clamp((t - 0.10) / 0.30))
outT = clamp((t - 0.74) / 0.22)
translateX: (1 - inT) * vp.w * 0.16 * (textRight ? -1 : 1)
opacity: inT * (1 - outT)
left: textRight ? '26%' : '74%'
```
`filter: grayscale(1) contrast(1.05)`. Ancho `min(vp.w * size, vp.h * size * 1.3)`.

Contenido (imágenes son placeholders):
| # | Objeto | Título | Nota | size |
|---|---|---|---|---|
| 1 | origami.png | Papel | La primera maqueta se dobla a mano. | 0.30 |
| 2 | casa.png | Volumen | La planta se prueba en tres dimensiones. | 0.34 |
| 3 | torre.png | Altura | La estructura se repite hasta el cielo. | 0.26 |
| 4 | edificio.png | Obra | El material queda a la vista. | 0.36 |

Kicker fijo arriba-izquierda: `Del papel a la obra`, `--fs-caption`, uppercase, `--blue-500`.

---

## Otras vistas

**Contact** — titular `Iniciar un / proyecto`, bajada
`Cuéntanos del terreno, el encargo y los plazos. Respondemos en dos días hábiles.`,
dato `Kioto, Japón`. Campos: `Nombre` (`Tu nombre`), `Correo` (`tu@correo.com`),
`Mensaje` (`Cuéntanos sobre tu proyecto`, 6 filas). Botón `Enviar mensaje` → `Enviado`.

**Footer** — `Construyamos / algo quieto`, `Kioto · Tokio`, fondo `--black`.

**ProjectDetail** — volver: `← Todos los proyectos`; tag `Residencial`; dos párrafos de
cuerpo (texto exacto en `ProjectDetail.jsx`).

---

## State Management

| Estado | Dónde | Qué hace |
|---|---|---|
| `rawP` | Statement | progreso 0→1 del ScrollTrigger largo; deriva `p` y `objP` |
| `vp` | Statement, Objects | `{w, h}` del viewport, actualizado en `resize` |
| `hover` | Statement | índice del panel bajo el cursor (−1 = ninguno) |
| `mode` | Nav | `hero` / `light` / `dark` / `hidden`, recalculado en `scroll` |
| `ready` | Tour | % de frames precargados |
| `progress` | Objects | prop opcional; si falta, crea su propio pin |
| `sent` | Contact | estado del botón de envío |

Sin data fetching. `window.__stmtProgress` se publica para que la nav pueda consultarlo.

---

## Design Tokens

Copiar tal cual desde `tokens/` (los archivos van en este paquete). Resumen:

**Color** (oklch)
`--black 0.16 0 0` · `--ink 0.22 0.002 260` · `--grey-900 0.28` · `--grey-700 0.42` ·
`--grey-500 0.58` · `--grey-300 0.78` · `--grey-200 0.87` · `--grey-100 0.93` ·
`--grey-50 0.97` · `--white 0.995 0 0`
`--blue-700 0.42 0.16 235` · `--blue-600 0.52 0.18 235` · `--blue-500 0.6 0.17 235` ·
`--blue-100 0.93 0.03 235`
Semánticos: `--text-primary`, `--text-secondary`, `--text-tertiary`, `--text-on-inverse`,
`--surface-page`, `--surface-inverse`, `--border-default`, `--accent` (= blue-600).

**Tipografía** — display `League Gothic`, sans `Sora` (300–700), vía Google Fonts.
Escala: `--fs-hero clamp(4.5rem,10vw,10rem)` · `--fs-h1 clamp(2.75rem,6vw,5.5rem)` ·
`--fs-h2 clamp(2rem,3.5vw,3rem)` · `--fs-h3 1.5rem` · `--fs-body-lg 1.25rem` ·
`--fs-body 1rem` · `--fs-small 0.875rem` · `--fs-caption 0.75rem`
Line-height: display 0.92 · heading 1.08 · body 1.6 · caption 1.4
Tracking: display 0.01em · caps 0.14em · tight −0.01em

**Espaciado** — 4, 8, 12, 16, 24, 32, 48, 64, 96, 128, 192, 256px (`--space-1` … `--space-12`).
`--container-max: 1440px`, `--gutter: var(--space-6)`.

**Efectos** — radios 0/2/4px (el diseño usa 0 casi siempre).
`--ease-standard cubic-bezier(0.16,1,0.3,1)` · `--ease-in cubic-bezier(0.7,0,0.84,0)` ·
`--ease-parallax cubic-bezier(0.22,1,0.36,1)`
`--dur-fast 180ms` · `--dur-base 420ms` · `--dur-slow 900ms` · `--dur-reveal 1400ms`

---

## Assets

| Ruta | Qué es | Estado |
|---|---|---|
| `assets/brand/cloud.svg` | marca nube, usada como máscara del zoom | **definitivo** |
| `assets/brand/cloud-line.svg` | nube de contorno para las bocanadas | **definitivo** |
| `assets/tour/frames/frame_001–120.webp` | recorrido de 120 frames | placeholder |
| `assets/imagery/photography-01.jpg`, `sketch-01.jpg`, `poster-01.jpg`, `hero-castle-sketch.png` | grilla de proyectos | placeholder |
| `assets/imagery/objects/origami.png`, `casa.png`, `torre.png`, `edificio.png` | secuencia de objetos, PNG con fondo transparente | placeholder |

Los PNG de objetos deben venir **recortados con transparencia** y en escala de grises o
neutros: el diseño les aplica `grayscale(1) contrast(1.05)`.

---

## Files

En `design_handoff_nube_studio_website/`:
- `README.md` — esta especificación (autosuficiente)
- `tokens/*.css` — tokens completos
- `styles.css` — hoja global del sistema
- `assets/brand/` — `cloud.svg`, `cloud-line.svg`
- `assets/tour/frames/` — los 120 frames del recorrido
- `assets/imagery/` — fotos de proyectos y `objects/` (PNG con transparencia)

El código fuente del prototipo vive en el proyecto de diseño, en `ui_kits/website/`:
`index.html` (punto de entrada, CDN de React + Babel + GSAP), `Homepage.jsx` (Statement:
nube, órbita, bocanadas, zoom, grilla, puertas), `Objects.jsx`, `Nav.jsx`, `Tour.jsx`,
`Contact.jsx`, `Footer.jsx`, `ProjectDetail.jsx`. Esos archivos son referencia: esta
especificación basta para implementar sin ellos.

Para ver el prototipo en movimiento hay que servir esa carpeta por HTTP con los assets
en las rutas relativas indicadas arriba.

---

## Riesgos conocidos / decisiones abiertas

1. El pin de `Statement` mide `+=1420%` de alto. En producción conviene medirlo en `vh`
   calculados, no en porcentaje, para que el ritmo no cambie con la altura de pantalla.
2. Las máscaras SVG animadas (`mask-position` + `mask-size` + `rotate`) son costosas.
   Vale la pena probar `will-change: mask-position` o un `<canvas>` si hay caídas de FPS.
3. La secuencia ya está en WebP; conviene añadir AVIF y precarga progresiva por lotes.
4. Falta definir el comportamiento en móvil: la escena está pensada para desktop.
   Sugerencia: en `< 900px`, reemplazar la órbita y las puertas por transiciones verticales simples.
5. `prefers-reduced-motion` no está implementado; hay que añadir un camino estático.
