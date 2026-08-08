# Plan de implementación móvil — Nube Studio

**Estado: las ocho tandas hechas.** `tsc --noEmit` y `next build` limpios;
verificado en el navegador a 375×812 y a 1280×800 en cada tanda.

- [x] **1 — Cimientos** · `svh`, `ignoreMobileResize`, ritmo −36%, safe-area
- [x] **2 — Nav** · hamburguesa → hoja a pantalla completa
- [x] **3 — Proyectos** · una tarjeta por pantalla, etiquetas siempre visibles
- [x] **4 — Objetos** · tarjeta por pieza
- [x] **5 — Nube** · cruce diagonal + zoom por `transform`
- [x] **6 — Tour** · recorte 4:5, anclas remapeadas, ficha en la banda, sin barra
- [x] **7 — Carga** · 1 de cada 3 frames, liberación temprana, WebP
- [x] **8 — Footer** · apilado, safe-area, hover sólo con puntero

### Lo que queda pendiente

1. **Validar `svh` en un teléfono real** con barra de direcciones que colapse.
   Es lo único que no se puede comprobar en el navegador de escritorio. Si
   aparece una franja abajo, cambiar los tres `100svh` por `100lvh`.
2. **Los frames 9:16.** Cuando lleguen: reemplazar los de
   `public/assets/tour/frames/m/`, ajustar `CROP_FROM` y `CROP_SPAN` en
   `lib/tour.ts` (o ponerlos en 0 y 1 si el nuevo set ya viene encuadrado), y
   revisar `tourPlate()` para que la placa deje de ser 4:5.

### Peso móvil

| | Antes | Ahora |
|---|---|---|
| Frames del tour | 7,9 MB (120) | **0,64 MB** (40 recortados) |
| Fotos | 2,9 MB | **1,2 MB** |
| Total bloqueante | 10,8 MB | **~0,4 MB** antes de soltar el scroll |

Decisiones cerradas.

| Segmento | Decisión |
|---|---|
| Nav | Hamburguesa → overlay a pantalla completa |
| Proyectos | Una tarjeta por pantalla |
| Objetos | Tarjeta por pieza |
| Tour — encuadre | Re-renderizar los 120 frames en 9:16 · **bloqueado, faltan assets** |
| Tour — interino | Recorte 4:5 generado con `sharp` mientras llegan |
| Nube — trayectoria | Cruce diagonal, esquina a esquina |
| Nube — zoom | `transform: scale()` en vez de `mask-size` |
| Ritmo | −36%: tour 10→6 vh, statement 11,8→8 vh |
| Barra de scroll del tour | Desaparece en móvil (ya lo pediste) |
| Footer | Las cuatro correcciones menores |

---

## Regla que garantiza no romper el escritorio

Todo entra por **uno de estos dos caminos, nunca otro**:

1. **CSS:** `@media (max-width: 767px)` dentro de los `.module.css` existentes.
   `Footer.module.css:282` ya usa ese patrón; no es algo nuevo.
2. **JS:** una rama dentro de las funciones puras de `lib/` que ya reciben
   `Viewport {w, h}` — `statementFrame()`, `objectFrames()`, `tourFrame()`.
   Se agrega `isNarrow(vp)` y solo debajo de 768px cambian los números.

Ningún valor que hoy afecte al escritorio se toca. Arriba de 768px el código
recorre exactamente las mismas líneas que hoy. Cada tanda cierra con
`npx tsc --noEmit` + `npm run build`, y la revisás en el navegador antes de seguir.

Constante única, archivo nuevo `lib/viewport.ts`:

```ts
export const NARROW = 768;
export const isNarrow = (vp: Viewport) => vp.w < NARROW;
```

---

## Diagnóstico que motivó cada decisión

Medido sobre el código a 375 × 812, no a ojo.

| # | Dónde | Qué pasa | Lo resuelve |
|---|-------|----------|-------------|
| 1 | `Nav.module.css` | Logotipo (~100px) + 3 enlaces con `gap: 32px` (~346px) + padding (64px) = **~510px** en 375. Se desborda. Área táctil de ~16px contra los 44px recomendados. | Tanda 2 |
| 2 | `Tour.tsx:126` | Frames 1280×720 pintados con `cover`. En vertical manda el alto: 812/720 = 1.128 → se dibujan a 1444px dentro de 375. **Se ve el 26% central.** | Tanda 6 |
| 3 | `lib/tour.ts` + `Tour.module.css:216` | Fichas de `width: 200px` en `left: var(--dx)` con `dx: -190` y `translate(-100%)`: el borde izquierdo cae en `anclaX − 390px`. Con el ancla en x=0.54 (202px) arranca en **−188px**. Fuera de pantalla, las siete. | Tanda 6 |
| 4 | `Tour.module.css` | Título, bajada, caption, `00%` y barra de progreso pelean por el mismo tercio inferior. | Tanda 6 |
| 5 | `lib/statement.ts:173` | `rx` cae al piso de 80 y `ry` queda en 229 → elipse **1 : 2.9**. Se lee como rebote vertical, no como vuelta. | Tanda 5 |
| 6 | `lib/statement.ts:24` | Nube en reposo de 132px fijos = **35% del ancho** (en escritorio es el 9%). Casi 4× más grande de lo diseñado. | Tanda 5 |
| 7 | `lib/statement.ts:192` | El zoom anima `mask-size` hasta ~15.000px sobre una capa a pantalla completa, más `mask-position` y `rotate`. Repintado puro. Principal sospechoso de caída de FPS. | Tanda 5 |
| 8 | `Statement.module.css:97` | `repeat(4, 1fr)` con 32px de padding y 24px de gap → cuatro columnas de **60px × ~700px**. Cuatro astillas. | Tanda 3 |
| 9 | `Statement.module.css:150` | Título, ciudad y dibujo axonométrico solo existen en `:hover`. En touch no hay hover: **los proyectos no tienen nombre**. Es pérdida de contenido, no de layout. | Tanda 3 |
| 10 | `lib/statement.ts:236` | `rotateY(82deg)` con `perspective: 1800px` calibrada para 1440px. A 375px la perspectiva es proporcionalmente 4× más lejana: el giro se aplana. | Tanda 3 |
| 11 | `ObjectsScene.module.css:44` | Columna de texto `width: 34%` = **127px**, con título de 32px y nota de 20px: ~7 caracteres por línea. Imágenes de ~120px. | Tanda 4 |
| 12 | `use-scroll-scene.ts` + los `100vh` | Al colapsar la barra de direcciones cambia `innerHeight`, ScrollTrigger recalcula y **el pin salta**. Sin mitigar hoy. | Tanda 1 |
| 13 | `lib/tour.ts` + `lib/statement.ts` | 10 + 11,8 = **21,8 alturas de pantalla** de scroll fijado. | Tanda 1 |
| 14 | `lib/assets.ts` | El loader bloquea hasta bajar **10,8 MB**. En 4G son 15–30 s de pantalla negra. `hero-castle-sketch.png` pesa **1,9 MB** él solo. | Tanda 7 |

No están rotos y no se tocan: el Loader (centrado, se adapta solo) y la capa de tokens.

---

# Tandas

## Tanda 1 — Cimientos

Invisible, no cambia nada del escritorio, y sin esto todo lo demás se ve con saltos.

- `lib/viewport.ts` nuevo, con `NARROW` e `isNarrow`.
- `lib/use-scroll-scene.ts`: nueva opción `mobileEndVh?: number`, evaluada dentro del
  callback `end:` que ya existe (así se recalcula sola en cada refresh, y como
  `invalidateOnRefresh` ya está en `true` no hace falta nada más).
- `ScrollTrigger.config({ ignoreMobileResize: true })` en el mismo archivo.
- Ritmo −36%: `TOUR_SCROLL_VH` 10 → 6 y `STATEMENT_SCROLL_VH` 11,8 → 8 en móvil.
  De ~22 a ~14 pantallas. `lib/scene-navigation.ts` mide los pin spacers reales,
  así que los saltos de la nav siguen correctos solos: no hay que tocarlo.
- `app/layout.tsx`: `viewportFit: 'cover'` en el export `viewport`.
- `100vh` → `100svh` en `.tour`, `.statement` (incluido su `margin-top: -100svh`)
  y `.objects`, los tres dentro del media query y **juntos**, porque el solape
  del statement sobre el tour depende de que ambos valores coincidan.
  Si al colapsar la barra aparece una franja abajo, se cambia a `100lvh`.
  Es lo único de esta tanda que hay que validar en un teléfono real.
- `env(safe-area-inset-*)` en la nav.

## Tanda 2 — Nav: hamburguesa a pantalla completa

- `Nav.tsx`: estado `open`, botón de 44×44 con dos hairlines (mismo lenguaje que
  la línea de la anotación del tour), y una hoja `position: fixed; inset: 0`
  negra con los tres destinos en League Gothic a `--fs-h2`, entrada escalonada y
  `hola@nubestudio.cl` abajo.
- `goTo()` cierra la hoja y después desplaza. La lógica de `readMode()` y los
  cuatro modos de color no se tocan; solo se añade que en modo `hidden` la nav
  sigue visible mientras la hoja está abierta.
- Sin bloqueo de scroll: la hoja es opaca y a pantalla completa, y lleva
  `overscroll-behavior: contain`. Bloquear el `<html>` con los pines activos
  puede disparar un refresh de ScrollTrigger, y no gana nada porque detrás de
  una capa opaca no se ve nada moverse.
- CSS: `.links` oculto y `.burger` visible solo bajo 767px. El escritorio queda
  byte a byte igual.

## Tanda 3 — Proyectos: una tarjeta por pantalla

- `Statement.module.css`: bajo 767px la grilla pasa a una sola celda
  (`grid-template-columns: 1fr`, una fila) con los cuatro paneles apilados en
  `grid-area: 1/1`. Cada tarjeta ocupa el ~85% de la pantalla.
- **Las etiquetas dejan de depender de `:hover`**: `.panelLabel` y `.wire` quedan
  visibles siempre en móvil. Es el arreglo más importante de esta tanda porque
  hoy los proyectos son fotos anónimas.
- `lib/statement.ts`: bajo `isNarrow(vp)`, `inner` reparte una ventana por
  tarjeta — entra desde la derecha, se queda quieta mientras se lee, sale hacia
  la izquierda cuando entra la siguiente.
- **Las puertas** no pueden girar 82° en un escenario de 375px: se aplanan. En
  móvil el gesto pasa a ser una **apertura desde el centro** — dos bandas negras
  que crecen desde el eje vertical hasta comerse la tarjeta. Mismo significado
  («la pared se abre»), coste de compositor, y sin duplicar el DOM de las fotos.

## Tanda 4 — Objetos: tarjeta por pieza

- `lib/objects.ts`: bajo `isNarrow(vp)`, `imageLeft`/`textLeft` colapsan a una
  columna centrada; la tarjeta ocupa el ~78% del ancho, foto arriba y texto
  abajo, entrando desde lados alternados. Rima con la tanda 3, así las dos
  secciones se leen como el mismo sistema.
- `imageWidth` pasa a `min(vp.w * 0.78, vp.h * 0.42 * aspect)`.
- El ascenso continuo se conserva pero se acorta el recorrido
  (`vp.h*0.62 → ~0.55` y `t*(vp.h*1.30) → ~1.15`) para que cada pieza se quede
  más tiempo legible en pantalla.
- `.text { width: 34% }` → ancho de tarjeta. `.note { max-width: 380px }` deja
  de aplicar bajo el breakpoint.

## Tanda 5 — Nube: cruce diagonal + zoom por transform

Dos cambios en la misma tanda porque tocan las mismas líneas.

- **Trayectoria.** Bajo `isNarrow(vp)`, la elipse de `statementFrame()` se
  sustituye por una recta de esquina a esquina: entra arriba, cruza por detrás
  del texto y sale hacia la opuesta antes de abrirse desde ahí. `lap` sigue
  siendo el parámetro, así que las bocanadas siguen funcionando — solo hay que
  darles la tangente de la recta en vez de la de la elipse, que queda constante
  y hace la estela más legible.
- Nube en reposo: `min(132, vp.w * 0.2)` ≈ 75px. Bocanadas 40 → 12 en móvil.
- **Zoom.** La capa `.mask` no es solo el revelado: es el **contenedor** de la
  grilla y de la capa de objetos (`Statement.tsx:137-184`), así que no se puede
  ocultar. En móvil pasa a `mask-image: none` con fondo negro opaco, y el
  revelado lo hace un `<img>` de la nube encima, escalado con `transform: scale()`
  — lo resuelve el compositor — que cruza al negro sólido al final. Visualmente
  ~90% idéntico y sin repintar 15.000px por tick. El escritorio conserva la
  máscara intacta porque el override vive dentro del media query.
- Texto: `padding-bottom: 38vh` → `~18svh` y titular a ~36px, para que el bloque
  quede centrado en vez de flotando arriba con un tercio vacío abajo.

## Tanda 6 — Tour · ⚠ bloqueada por assets

**Lo que necesito de vos:** los 120 frames re-renderizados en 9:16 desde la
fuente 3D, con la cámara reencuadrada. Recortar los actuales no sirve: 1280×720
a 9:16 da 405 de 1280 = 32% del render, prácticamente el mismo 26% que ya hay.

Mientras tanto dejo el tour utilizable con lo que hay:

- Recorte **4:5** generado con `sharp` (`sharp` ya está en `node_modules` por
  Next; `ffmpeg` no está disponible en esta máquina). 576 de 1280 = **45%
  visible**, casi el doble que hoy. La placa ocupa el 58% superior y abajo queda
  una banda negra de ~340px para el título, el caption y la ficha.
- Los frames móviles se generan a 640px de ancho: baja el peso del tour de
  7,9 MB a ~1,5 MB sin tocar el set de escritorio.
- **Tabla de anclas para móvil.** Inevitable en los dos escenarios: tanto el
  recorte 4:5 como el re-render 9:16 cambian qué fracción del cuadro ocupa cada
  cosa, así que los 7 puntos necesitan coordenadas propias. Se agregan como un
  campo opcional en `TOUR_STOPS` y se leen solo bajo el breakpoint.
- Las fichas dejan de colgar del punto y pasan a **tarjeta inferior a ancho
  completo**, con la hairline dibujada desde el punto hasta el borde de la
  tarjeta. Un solo punto abierto a la vez, como ya funciona.
- **Fuera la barra de scroll**: `.track`, `.marks` y el `00%` se ocultan en móvil.
- Título del hero: `--fs-hero` clampea a 72px en 375px y «DE LAS NUBES» pide
  ~311px contra los 311px disponibles. Queda justo en el límite; se baja a ~56px.

Cuando lleguen los frames 9:16 se cambia el manifiesto y se reajustan las anclas.
Nada más del trabajo de esta tanda se pierde.

## Tanda 7 — Peso y carga

Es lo que decide si alguien llega a ver todo lo anterior.

- Presupuesto de frames en móvil: 1 de cada 3 (40 frames). El `draw()` de
  `Tour.tsx:96-113` **ya tiene** el fallback al vecino decodificado más cercano,
  así que los huecos se cubren solos. Junto con los 640px de la tanda 6, el tour
  baja de 7,9 MB a ~500 KB.
- Liberar el scroll cuando termina la pasada gruesa (`tourPreloadOrder` ya carga
  de 8 en 8 primero) y seguir rellenando de fondo: el % del loader deja de ser
  una espera y pasa a ser un arranque.

**Aparte, y necesita tu visto bueno porque toca también el escritorio:**
`hero-castle-sketch.png` son 1,9 MB de PNG para una foto de proyecto. Pasarlo a
WebP lo deja en ~150 KB sin cambio visual, y mejora la carga en las dos
plataformas. Decime si lo incluyo.

## Tanda 8 — Footer

Ya tiene breakpoint en 900px; falta poco. Las cuatro, no son excluyentes:
la barra inferior de tres elementos se apila en dos filas (hoy se desarma en
375px), se elimina el descriptor del medio, el cajón de contacto queda **abierto
por defecto** en móvil (hoy depende de `:hover`, igual que los proyectos), y el
bloque de contacto pasa a ser un área tocable a ancho completo.

---

## Orden de ejecución

1. **Tanda 1** — cimientos. Sin esto no se puede evaluar nada.
2. **Tanda 2** — nav. Es lo primero que se ve.
3. **Tanda 3** — proyectos. El problema más visible, y recupera contenido perdido.
4. **Tanda 5** — nube. El más delicado; el zoom por transform decide si el resto
   se siente fluido.
5. **Tanda 4** — objetos.
6. **Tanda 7** + **8** — carga y footer.
7. **Tanda 6** — tour, en cuanto lleguen los frames. El interino 4:5 puede
   entrar antes si querés verlo funcionando ya.
