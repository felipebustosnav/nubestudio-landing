import { clamp01 } from './math';
import { windowIsNarrow } from './viewport';

export const TOUR_FRAME_COUNT = 120;

/**
 * The narrow layout serves a 4:5 crop of each frame — 576 of the 1280 px,
 * taken around x = 0.60 rather than the middle, which is where the volume sits
 * in all three stops. A full-bleed cover crop of the 16:9 original would show
 * about a quarter of the width and cut the building in half.
 */
const CROP_FROM = 480 / 1280;
const CROP_SPAN = 576 / 1280;

/** Anchors are authored against the full frame; on a phone they map through
 *  the same window the pictures were cut with. */
export const anchorX = (x: number, narrow: boolean): number =>
  narrow ? (x - CROP_FROM) / CROP_SPAN : x;

export interface PlateRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Where the picture is painted on a narrow layout: a 4:5 plate across the top,
 * leaving the rest of the screen black for the title, the caption and the open
 * note. Mirrored by the `.stop` box in Tour.module.css, so the anchors land on
 * the picture rather than on the screen.
 */
export function tourPlate(w: number, h: number): PlateRect {
  const height = Math.min(w * 1.25, h * 0.62);
  const width = height * 0.8;
  return { x: (w - width) / 2, y: 0, w: width, h: height };
}

/** Scroll length of the pinned tour, in viewport heights. */
export const TOUR_SCROLL_VH = 10;

/**
 * The same tour on a phone. A thumb flick covers far less ground than a wheel,
 * so the whole choreography is compressed rather than reproduced at length.
 */
export const TOUR_SCROLL_VH_MOBILE = 6;

/* Takes only the index, so `.map(tourFrameSrc)` stays safe. */
export const tourFrameSrc = (i: number): string =>
  `/assets/tour/frames/${windowIsNarrow() ? 'm/' : ''}frame_${String(i).padStart(3, '0')}.webp`;

/**
 * Scroll timeline as [progress, frame] pairs. Flat runs are camera holds, one
 * per stop — each is long enough to read a note and click the next point.
 *
 * The camera pushes off the moment the title starts fading (0.03) and only
 * settles at frame 34, close enough that the framing pines have shrunk to
 * fragments at the edges. The last stretch holds on frame 119 while the
 * statement rides up over the pin.
 */
const TOUR_KEYS: readonly (readonly [number, number])[] = [
  [0, 8],
  [0.03, 8],
  [0.17, 34],
  [0.3, 34],
  [0.45, 60],
  [0.6, 60],
  [0.74, 119],
  [1, 119],
];

/** Interpolated frame number for a scroll progress in 0→1. */
export function tourFrameAt(p: number): number {
  for (let i = 0; i < TOUR_KEYS.length - 1; i++) {
    const [p0, f0] = TOUR_KEYS[i];
    const [p1, f1] = TOUR_KEYS[i + 1];
    if (p <= p1) {
      const t = p1 === p0 ? 0 : (p - p0) / (p1 - p0);
      return f0 + (f1 - f0) * t;
    }
  }
  return TOUR_KEYS[TOUR_KEYS.length - 1][1];
}

export interface TourPoint {
  /** Anchor, as a fraction of the viewport. */
  x: number;
  y: number;
  /** Offset of the label card from the anchor, in px. */
  dx: number;
  dy: number;
  index: string;
  label: string;
  note: string;
}

export interface TourStop {
  id: string;
  label: string;
  from: number;
  to: number;
  caption: string | null;
  points: readonly TourPoint[];
}

export const TOUR_STOPS: readonly TourStop[] = [
  {
    id: 'volume',
    label: 'El volumen',
    from: 0.185,
    to: 0.295,
    caption: 'Un volumen único, apoyado donde el terreno ya era plano.',
    // Anchored on frame 34: the ridge sits around 54% / 41%, the base of the
    // volume meets the meadow around 46% / 60%.
    points: [
      {
        x: 0.54,
        y: 0.41,
        dx: -190,
        dy: -90,
        index: '01',
        label: 'Perfil',
        note: 'Dos aguas sin alero. La silueta se recorta limpia contra el cielo y no necesita más gesto que ese.',
      },
      {
        x: 0.46,
        y: 0.6,
        dx: -180,
        dy: 90,
        index: '02',
        label: 'Implantación',
        note: 'El movimiento de tierra es mínimo: la casa se apoya en la cota donde la pendiente ya cedía.',
      },
    ],
  },
  {
    id: 'rotation',
    label: 'El giro',
    from: 0.455,
    to: 0.595,
    caption:
      'La masa se abre a medida que la mirada la rodea: lo que parecía un bloque cerrado resulta ser una sucesión de planos.',
    points: [
      {
        x: 0.63,
        y: 0.31,
        dx: -200,
        dy: -70,
        index: '03',
        label: 'Cumbrera',
        note: 'Un solo faldón, continuo de extremo a extremo, sin quiebres ni juntas a la vista.',
      },
      {
        x: 0.74,
        y: 0.61,
        dx: -170,
        dy: 90,
        index: '04',
        label: 'Voladizo',
        note: 'La losa pasa el muro y se detiene en el aire. Debajo, la sombra hace de zaguán.',
      },
    ],
  },
  {
    id: 'threshold',
    label: 'El umbral',
    from: 0.745,
    to: 0.885,
    caption:
      'La llegada. El piso interior y el exterior comparten cota y material, y el umbral deja de notarse.',
    points: [
      {
        x: 0.55,
        y: 0.31,
        dx: -210,
        dy: -60,
        index: '05',
        label: 'Cubierta',
        note: 'Dos lucernarios fuera del eje de la cumbrera, orientados a recoger el sol de la tarde.',
      },
      {
        x: 0.52,
        y: 0.58,
        dx: -180,
        dy: 100,
        index: '06',
        label: 'Sala',
        note: 'El vidrio corre por completo y la sala se vuelve terraza sin cambiar de suelo.',
      },
      {
        x: 0.8,
        y: 0.66,
        dx: -60,
        dy: 80,
        index: '07',
        label: 'Terraza',
        note: 'Piedra vaciada in situ, a nivel con el pasto. El borde se pierde contra el jardín.',
      },
    ],
  },
];

export interface TourFrame {
  /** Frame number to paint, 1-based, fractional. */
  frame: number;
  /** The render opens in its own colour and drains to grey. */
  grayscale: number;
  contrast: number;
  saturate: number;
  titleOpacity: number;
  titleShift: number;
  percent: number;
}

export function tourFrame(progress: number): TourFrame {
  const gray = clamp01((progress - 0.4) / 0.34);
  // Clears at 0.12, before the first stop opens at 0.135.
  const titleOut = clamp01((progress - 0.03) / 0.09);
  return {
    frame: tourFrameAt(progress),
    grayscale: gray,
    contrast: 1 + 0.06 * gray,
    saturate: 1 - 0.15 * (1 - gray),
    titleOpacity: 1 - titleOut,
    titleShift: titleOut * -24,
    percent: Math.round(progress * 100),
  };
}

/**
 * Load order for the frame sequence: a coarse pass over every 8th frame so the
 * whole tour is scrubbable early, then progressively fill the gaps.
 */
export function tourPreloadOrder(total: number = TOUR_FRAME_COUNT, step = 1): number[] {
  const order: number[] = [];
  const seen = new Set<number>();
  // A phone fetches every `step`-th frame and no more. Tour's draw() already
  // falls back to the nearest decoded neighbour, so the gaps cover themselves.
  const wanted = (i: number) => (i - 1) % step === 0 || i === total;
  const push = (i: number) => {
    if (wanted(i) && !seen.has(i)) {
      seen.add(i);
      order.push(i);
    }
  };
  for (let s = 8; s >= 1; s = s === 1 ? 0 : Math.floor(s / 2)) {
    for (let i = 1; i <= total; i += s) push(i);
  }
  for (let i = 1; i <= total; i++) push(i);
  return order;
}

/** One in three on a phone: 40 frames instead of 120. */
export const TOUR_FRAME_STEP_MOBILE = 3;
