import { clamp01, hashNoise, smoothstep, type Viewport } from './math';
import { isNarrow } from './viewport';

/** Scroll length of the pinned statement scene, in viewport heights. */
export const STATEMENT_SCROLL_VH = 11.8;

/** Compressed for the thumb. The act split below stays proportional. */
export const STATEMENT_SCROLL_VH_MOBILE = 8;

/**
 * The scene runs two acts over one pin. Raw progress where the cloud, the
 * project grid and the doors finish — 0.53 of 11.8vh keeps that act at the
 * 6.25vh it has always had.
 */
export const DOORS_END = 0.53;

/**
 * Raw progress where the closing sequence takes over. It opens just before
 * the doors have finished clearing, so the two acts overlap rather than cut.
 */
export const OBJECTS_FROM = 0.5;

/**
 * On a phone the doors are one black panel closing rather than four leaving,
 * so there is nothing to see through while it shuts. The sequence waits for it
 * to finish instead of overlapping it.
 */
export const OBJECTS_FROM_NARROW = 0.54;

export const CLOUD_SRC = '/assets/brand/cloud.svg';
export const CLOUD_LINE_SRC = '/assets/brand/cloud-line.svg';
export const CLOUD_ASPECT = 1.537;
export const CLOUD_LINE_ASPECT = 1.517;
/** Width of the mark at rest, in px. */
export const CLOUD_REST = 132;
/** Propulsion puffs, emitted one at a time as the cloud travels. */
export const PUFF_COUNT = 40;
/** How much of a lap the cloud makes before it opens. */
export const CLOUD_TURNS = 0.62;

/**
 * Base width of the narrow-screen zoom layer. There the mark keeps a fixed
 * mask and grows by `transform: scale()` — the compositor handles that, while
 * animating mask-size on a full-screen layer repaints every tick.
 */
export const ZOOM_BASE = 320;

/** Total travel along the path, as an angle. Whatever shape the path is. */
const SWEEP = Math.PI * 2 * CLOUD_TURNS;

export interface Project {
  src: string;
  title: string;
  place: string;
  program: string;
  year: number;
}

/** One project per cell, left to right. */
export const PROJECTS: readonly Project[] = [
  {
    src: '/assets/imagery/photography-01.jpg',
    title: 'Plaza Cubierta del Mercado',
    place: 'Valparaíso',
    program: 'Espacio público',
    year: 2024,
  },
  {
    src: '/assets/imagery/sketch-01.jpg',
    title: 'Residencia Voladizo',
    place: 'Cajón del Maipo',
    program: 'Vivienda',
    year: 2023,
  },
  {
    src: '/assets/imagery/hero-castle-sketch.webp',
    title: 'Pabellón de Lectura',
    place: 'Valdivia',
    program: 'Cultura',
    year: 2023,
  },
  {
    src: '/assets/imagery/poster-01.jpg',
    title: 'Centro Cívico Ribera Norte',
    place: 'Concepción',
    program: 'Equipamiento',
    year: 2022,
  },
];

/** A loose axonometric volume, drawn over a tile on hover. */
export const WIRE = {
  lines: [
    [20, 38, 60, 22],
    [60, 22, 100, 38],
    [100, 38, 60, 54],
    [60, 54, 20, 38],
    [20, 55, 60, 39],
    [60, 39, 100, 55],
    [100, 55, 60, 71],
    [60, 71, 20, 55],
    [20, 72, 60, 56],
    [60, 56, 100, 72],
    [100, 72, 60, 88],
    [60, 88, 20, 72],
    [20, 38, 20, 72],
    [100, 38, 100, 72],
    [60, 54, 60, 88],
    [60, 22, 60, 56],
    [37, 47, 37, 80],
    [83, 47, 83, 80],
  ],
  piles: [
    [20, 72, 20, 96],
    [100, 72, 100, 96],
    [60, 88, 60, 110],
    [37, 80, 37, 102],
    [83, 80, 83, 102],
  ],
} as const;

/**
 * Hinges for the door pairs. Values outside 0–100% are intentional: they put
 * both panels of a pair on the same hinge, so each pair swings as one wall.
 */
export const PANEL_HINGES = [0, -100, 200, 100] as const;

export interface PuffFrame {
  visible: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
}

export interface PanelFrame {
  /** Entrance from the right, in px. */
  slideX: number;
  /** Door push-out along the hinge axis, in % of the panel. */
  pushX: number;
  rotateY: number;
  opacity: number;
  brightness: number;
  interactive: boolean;
}

export interface CloudMaskFrame {
  /** Centre of the mark in viewport px. */
  x: number;
  y: number;
  /** Mask width in px; height follows CLOUD_ASPECT. */
  size: number;
  spin: number;
}

export interface StatementFrame {
  /** Which arrangement this frame describes, so the DOM knows what to write. */
  narrow: boolean;
  /** Cloud + projects + doors, 0→1 over the first 44% of the scene. */
  progress: number;
  /** Object sequence, 0→1 over the last 58.5%. */
  objectsProgress: number;
  statementOpacity: number;
  statementShift: number;
  hintOpacity: number;
  /** Backing black, opaque before the first project arrives. */
  solidOpacity: number;
  /**
   * Narrow screens only, 0→1. A 82° swing needs a stage far wider than a phone
   * to read as a wall turning, so there the doors become an opening down the
   * middle of the last card instead. Stays 0 on desktop.
   */
  doorOpen: number;
  /**
   * The panel has done its job once the act is over, and it sits above the
   * closing sequence — so it lifts, over black, as that sequence opens.
   */
  doorOpacity: number;
  /**
   * Narrow screens only: there the mask layer is a plain black panel, so it has
   * to fade in as the zoom lands. 1 on desktop, where the mask does its own
   * reveal through the cloud shape.
   */
  maskOpacity: number;
  /** Narrow screens only: scale for the fixed-mask zoom layer. */
  zoomScale: number;
  mask: CloudMaskFrame;
  puffs: PuffFrame[];
  panels: PanelFrame[];
}

/**
 * The whole pinned scene as a function of raw ScrollTrigger progress. Every
 * value the DOM needs comes out of here; the component only writes it down.
 */
export function statementFrame(raw: number, vp: Viewport): StatementFrame {
  const narrow = isNarrow(vp);
  // The cloud lap, projects and doors take the first act; the closing sequence
  // owns the rest of the same pinned screen and opens just before the doors.
  const p = clamp01(raw / DOORS_END);
  const from = narrow ? OBJECTS_FROM_NARROW : OBJECTS_FROM;
  const objectsProgress = clamp01((raw - from) / (1 - from));

  // Phase 1 — a counter-clockwise lap around the copy, or a crossing on a phone.
  const lap = smoothstep(clamp01((p - 0.05) / 0.21));
  const angle = lap * SWEEP;
  // Phase 2 — it starts growing while still turning, and the zoom carries on.
  const open = clamp01((p - 0.17) / 0.2);
  const textOut = clamp01((p - 0.14) / 0.09);

  // 132px is 9% of a desktop stage but 35% of a phone, so the mark is sized
  // against the viewport once it gets narrow.
  const rest = narrow ? Math.min(CLOUD_REST, vp.w * 0.2) : CLOUD_REST;
  // Keep the whole mark inside the panel: it rotates, so allow for its diagonal.
  const pad = rest * 0.85;

  let at: (a: number) => { x: number; y: number };
  let tangent: (a: number) => { dx: number; dy: number };
  // Puffs sit along the path, so their angle follows whatever shape it is.
  let pathSpin: (a: number) => number;

  if (narrow) {
    // An ellipse degenerates on a tall screen — the radii come out roughly
    // 1:3 and it reads as a vertical bounce rather than a lap. A straight
    // crossing reads the same at any proportion, and the trail stays legible
    // because its direction never changes.
    const from = { x: vp.w * -0.16, y: vp.h * 0.12 };
    const run = { x: vp.w * 1.32, y: vp.h * 0.74 };
    const len = Math.hypot(run.x, run.y) || 1;
    const unit = { dx: run.x / len, dy: run.y / len };
    const deg = (Math.atan2(run.y, run.x) * 180) / Math.PI;
    at = (a) => ({ x: from.x + run.x * (a / SWEEP), y: from.y + run.y * (a / SWEEP) });
    tangent = () => unit;
    pathSpin = () => deg;
  } else {
    const cx = vp.w * 0.5;
    const cy = vp.h * 0.42;
    const rx = Math.max(80, Math.min(vp.w * 0.44, vp.w * 0.5 - pad));
    const ry = Math.max(60, Math.min(vp.h * 0.34, cy - pad, vp.h - cy - pad));
    at = (a) => ({ x: cx + rx * Math.sin(a), y: cy + ry * Math.cos(a) });
    tangent = (a) => {
      const dx = rx * Math.cos(a);
      const dy = -ry * Math.sin(a);
      const l = Math.hypot(dx, dy) || 1;
      return { dx: dx / l, dy: dy / l };
    };
    pathSpin = (a) => (-a * 180) / Math.PI;
  }

  const head = at(angle);
  // As it grows it slides back to the middle, so no edge ever clips it.
  const centre = smoothstep(clamp01(open / 0.4));
  const mx = head.x + (vp.w / 2 - head.x) * centre;
  const my = head.y + (vp.h / 2 - head.y) * centre;
  const spin = -360 * smoothstep(clamp01((p - 0.05) / 0.2));

  // The vector cloud has open interior swirls, so it has to run well past the
  // viewport before its body clears every corner. On a phone the backing black
  // is already opaque by the time the zoom lands, so it can stop far sooner —
  // which keeps the scaled mask from being magnified into mush.
  const cover = Math.max(vp.w, vp.h * CLOUD_ASPECT) * (narrow ? 6 : 12);
  const size = rest * Math.pow(cover / rest, open);

  // Puffs only while the cloud is actually travelling its path.
  const trailOn =
    Math.min(clamp01(lap / 0.06), clamp01((1 - lap) / 0.1)) * (1 - clamp01(open / 0.12));
  // Fewer of them on a phone: the trail reads at a glance and there is far less
  // path to spread them over.
  const count = narrow ? 12 : PUFF_COUNT;
  const gap = SWEEP / count;

  const puffs: PuffFrame[] = [];
  for (let i = 0; i < PUFF_COUNT; i++) {
    if (i >= count) {
      puffs.push({ visible: false, x: 0, y: 0, width: 0, height: 0, rotation: 0, opacity: 0 });
      continue;
    }
    // Several alive at once, so the trail streams instead of blinking.
    const span = gap * (2.6 + hashNoise(i, 1) * 1.8);
    const born = ((i + hashNoise(i, 2) * 0.6) / count) * SWEEP;
    const life = (angle - born) / span;
    if (life < 0 || life > 1) {
      puffs.push({ visible: false, x: 0, y: 0, width: 0, height: 0, rotation: 0, opacity: 0 });
      continue;
    }
    // Born from the tail, drifting further back as they age.
    const a = angle - 0.17 - life * 0.5;
    const b = at(a);
    const t = tangent(a);
    const side = (hashNoise(i, 4) - 0.5) * 30 * (0.3 + life);
    const width = rest * (0.14 + hashNoise(i, 5) * 0.16) * (0.8 + 0.5 * life);
    puffs.push({
      visible: true,
      x: b.x - t.dy * side,
      y: b.y + t.dx * side,
      width,
      height: width / CLOUD_LINE_ASPECT,
      rotation: pathSpin(a) + (hashNoise(i, 7) - 0.5) * 30,
      opacity:
        Math.min(1, life / 0.14) * (1 - life) * (0.8 + hashNoise(i, 6) * 0.2) * trailOn,
    });
  }

  // The four panels all land before the doors open. On a phone they wait until
  // the zoom has actually covered the screen — arriving any earlier and they
  // show through the cloud's open swirls as ghosts. Both windows still finish
  // at 0.82, so the doors are unaffected.
  const inner = narrow ? clamp01((p - 0.4) / 0.42) : clamp01((p - 0.34) / 0.48);
  const seg = 1 / PROJECTS.length;
  // At the end the two pairs swing open like a building turning, hinged on
  // their outer edges, then leave sideways — they never drop.
  const door = smoothstep(clamp01((p - 0.86) / 0.13));
  const away = smoothstep(clamp01((p - 0.93) / 0.07));

  const panels: PanelFrame[] = PROJECTS.map((_, i) => {
    // On a phone the four cells would be 60px wide, so the grid collapses to
    // one cell and the panels take it in turn: in from the right, a beat to be
    // read, out to the left as the next one arrives.
    if (narrow) {
      const last = i === PROJECTS.length - 1;
      // Windows run long so they overlap and the hand-off never leaves the
      // screen empty, but the first still starts from nothing rather than
      // appearing already half in.
      const u = (inner - i * seg) / (seg * 1.34);
      const enter = smoothstep(clamp01(u / 0.34));
      // The last one stays: it is what the doors open over.
      const leave = last ? 0 : smoothstep(clamp01((u - 0.62) / 0.34));
      const reach = vp.w + 40;
      return {
        slideX: (1 - enter) * reach - leave * reach,
        pushX: 0,
        rotateY: 0,
        // The last one clears as the doors finish shutting, so the panel can
        // lift again over plain black with nothing left behind it.
        opacity: u <= 0 ? 0 : 1 - away,
        brightness: last ? 1 - door * 0.4 : 1,
        interactive: enter > 0.98 && leave === 0,
      };
    }

    const t = smoothstep(clamp01((inner - i * seg) / seg));
    const dir = i < 2 ? -1 : 1;
    return {
      slideX: (1 - t) * (vp.w + 40),
      pushX: (door * 6 + away * 130) * dir,
      rotateY: door * 82 * dir,
      opacity: t > 0 ? 1 - away : 0,
      brightness: 1 - door * 0.45,
      interactive: t > 0.98 && away === 0,
    };
  });

  return {
    narrow,
    progress: p,
    objectsProgress,
    statementOpacity: 1 - textOut,
    statementShift: textOut * -28,
    hintOpacity: 1 - clamp01(p / 0.05),
    solidOpacity: clamp01((p - 0.31) / 0.05),
    doorOpen: narrow ? door : 0,
    doorOpacity: narrow ? 1 - clamp01((raw - DOORS_END) / 0.025) : 0,
    // Only once the zoom and the backing black have the screen between them —
    // any earlier and the cards behind it show through the cloud's swirls.
    maskOpacity: narrow ? clamp01((p - 0.355) / 0.045) : 1,
    zoomScale: size / ZOOM_BASE,
    mask: { x: mx, y: my, size, spin },
    puffs,
    panels,
  };
}
