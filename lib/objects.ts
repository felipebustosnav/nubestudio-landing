import { clamp01, easeOutCubic, type Viewport } from './math';
import { isNarrow } from './viewport';

export interface StudioObject {
  src: string;
  title: string;
  note: string;
  /** Plate width as a fraction of the viewport width. */
  size: number;
  /** Native width / height, so each plate keeps its own proportions. */
  aspect: number;
}

/** No plate is ever taller than this fraction of the viewport. */
const MAX_IMAGE_HEIGHT = 0.62;

export const OBJECTS: readonly StudioObject[] = [
  {
    src: '/assets/imagery/objects/piel.jpg',
    title: 'Piel',
    note: 'Una sola pieza repetida hasta cubrirlo todo. La fachada cambia con la hora del día y no necesita otro ornamento.',
    size: 0.32,
    aspect: 1.499,
  },
  {
    src: '/assets/imagery/objects/masa.jpg',
    title: 'Masa',
    note: 'El hormigón se curva y el peso se vuelve sombra. La forma se entiende recorriéndola, no mirándola de frente.',
    size: 0.3,
    aspect: 1.166,
  },
  {
    src: '/assets/imagery/objects/ritmo.jpg',
    title: 'Ritmo',
    note: 'La estructura se repite y el intervalo hace el resto: entre pilar y pilar, la luz va midiendo el recorrido.',
    size: 0.24,
    aspect: 0.8,
  },
  {
    src: '/assets/imagery/objects/lugar.jpg',
    title: 'Lugar',
    note: 'El edificio termina donde empieza la plaza. Lo que se proyecta, al final, es el espacio que queda entre medio.',
    size: 0.3,
    aspect: 1,
  },
];

/** Scroll length when the sequence runs on its own pin, in viewport heights. */
export const OBJECTS_SCROLL_VH = 5.2;

/** The last piece gets to leave before the end. */
export const OBJECT_STEP = 1 / (OBJECTS.length + 0.25);

/** Even indices put the text on the right, odd on the left. */
export const textOnRight = (i: number): boolean => i % 2 === 0;

/**
 * Both halves sit near the middle: far enough apart to read as two elements,
 * close enough to read as one composition.
 */
export const imageLeft = (i: number): string => (textOnRight(i) ? '32%' : '68%');
export const textLeft = (i: number): string => (textOnRight(i) ? '52%' : '14%');

/** Reach of the diagonal entrance, as a fraction of the viewport. */
const ENTRANCE_X = 0.11;
const ENTRANCE_Y = 0.15;

/**
 * Narrow screens stack the two halves into one card — a 34% text column is
 * about seven characters wide on a phone. The plate sits above the words and
 * the pair travel together.
 */
const CARD_WIDTH = 0.78;
const CARD_MAX_HEIGHT = 0.4;
/** Gap between the plate's bottom edge and the top of the words, in px. */
const CARD_GAP = 20;
/**
 * A shorter climb than the desktop's, so each piece lingers longer — and so
 * the card is spent before it reaches the bar at the top, which a full-width
 * plate would otherwise ride straight under.
 */
const CARD_FROM = 0.46;
const CARD_TRAVEL = 0.92;

export interface ObjectFrame {
  visible: boolean;
  /** Continuous bottom-to-top travel, in px from the vertical centre. */
  textY: number;
  textOpacity: number;
  /** Diagonal entrance offset, in px, from the corner opposite the text. */
  imageX: number;
  imageY: number;
  imageOpacity: number;
  imageWidth: number;
}

/**
 * The windows overlap on purpose: the next text starts rising while the
 * previous one is still leaving, and the image fades out where it stands.
 *
 * The image travels in on a diagonal, alternating ends of the same axis:
 * from the lower left when the text is on the right, from the upper right
 * when it is on the left.
 */
export function objectFrames(p: number, vp: Viewport): ObjectFrame[] {
  const narrow = isNarrow(vp);
  return OBJECTS.map((o, i) => {
    const t = (p - i * OBJECT_STEP + 0.055) / (OBJECT_STEP * 1.2);
    if (t < -0.05 || t > 1.05) {
      return {
        visible: false,
        textY: 0,
        textOpacity: 0,
        imageX: 0,
        imageY: 0,
        imageOpacity: 0,
        imageWidth: 0,
      };
    }
    const inT = easeOutCubic(clamp01((t - 0.1) / 0.3));
    const outT = clamp01((t - 0.74) / 0.22);
    const entrance = 1 - inT;
    const side = textOnRight(i) ? -1 : 1;

    if (narrow) {
      // One column: the plate rides just above the words and both climb on the
      // same line, so the pair reads as a single card rather than two things
      // crossing the screen.
      const cardY = vp.h * CARD_FROM - t * (vp.h * CARD_TRAVEL);
      // Plate and words share one fade, because they are one card — and it has
      // to be spent by the time it climbs level with the bar.
      const cardIn = easeOutCubic(clamp01((t - 0.05) / 0.25));
      const opacity = cardIn * (1 - clamp01((t - 0.52) / 0.26));
      return {
        visible: true,
        textY: cardY + CARD_GAP,
        textOpacity: opacity,
        // A short sideways nudge on the way in, still alternating, so the card
        // arrives from somewhere instead of simply appearing.
        imageX: (1 - cardIn) * vp.w * 0.06 * side,
        imageY: cardY - CARD_GAP,
        imageOpacity: opacity,
        imageWidth: Math.min(vp.w * CARD_WIDTH, vp.h * CARD_MAX_HEIGHT * o.aspect),
      };
    }

    return {
      visible: true,
      textY: vp.h * 0.62 - t * (vp.h * 1.3),
      textOpacity: clamp01(t / 0.06) * clamp01((1 - t) / 0.06),
      imageX: entrance * vp.w * ENTRANCE_X * side,
      imageY: entrance * vp.h * ENTRANCE_Y * -side,
      imageOpacity: inT * (1 - outT),
      imageWidth: Math.min(vp.w * o.size, vp.h * MAX_IMAGE_HEIGHT * o.aspect),
    };
  });
}
