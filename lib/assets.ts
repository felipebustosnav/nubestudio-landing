import { OBJECTS } from './objects';
import { CLOUD_LINE_SRC, CLOUD_SRC, PROJECTS } from './statement';
import { TOUR_FRAME_COUNT, TOUR_FRAME_STEP_MOBILE, tourFrameSrc, tourPreloadOrder } from './tour';
import { windowIsNarrow } from './viewport';

/**
 * Everything the scenes paint, coarse frames first. On a desktop connection
 * the loading screen walks the whole list before anything scrolls, so no frame
 * is ever missing mid-scrub.
 */
export function assetManifest(): string[] {
  const step = windowIsNarrow() ? TOUR_FRAME_STEP_MOBILE : 1;
  return [
    CLOUD_SRC,
    CLOUD_LINE_SRC,
    ...tourPreloadOrder(TOUR_FRAME_COUNT, step).map(tourFrameSrc),
    ...PROJECTS.map((project) => project.src),
    ...OBJECTS.map((object) => object.src),
  ];
}

const decoded = new Map<string, HTMLImageElement>();

/** The tour paints from here rather than re-requesting frames. */
export const getCachedImage = (src: string): HTMLImageElement | undefined => decoded.get(src);

let ready = false;
const listeners = new Set<() => void>();

export const assetsAreReady = (): boolean => ready;

/** Runs the callback now if loading already finished, otherwise once it does. */
export function onAssetsReady(callback: () => void): () => void {
  if (ready) {
    callback();
    return () => {};
  }
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

/** Requests in flight at once. */
const CONCURRENCY = 6;

/**
 * How far into the manifest a phone gets before the page is let go: the two
 * marks and the first coarse sweep of frames. The rest streams in behind the
 * opening screen.
 */
const EARLY_RELEASE = 18;

/**
 * Loads every asset, reporting 0→1. The final step waits on the webfonts, so
 * the first painted frame already has League Gothic and Sora in place.
 */
export async function loadAssets(onProgress: (fraction: number) => void): Promise<void> {
  const manifest = assetManifest();
  const total = manifest.length + 1;
  let done = 0;

  let release = () => {};
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });

  const load = (src: string) =>
    new Promise<void>((resolve) => {
      const image = new Image();
      image.onload = image.onerror = () => {
        if (image.naturalWidth) decoded.set(src, image);
        done += 1;
        onProgress(done / total);
        if (done >= EARLY_RELEASE) release();
        resolve();
      };
      image.src = src;
    });

  const everything = (async () => {
    for (let i = 0; i < manifest.length; i += CONCURRENCY) {
      await Promise.all(manifest.slice(i, i + CONCURRENCY).map(load));
    }

    await document.fonts?.ready;
    done += 1;
    onProgress(done / total);

    ready = true;
    listeners.forEach((listener) => listener());
    listeners.clear();
  })();

  // A phone is let go once the coarse sweep has landed and the rest streams in
  // behind it — half a minute of black over mobile data is a far worse trade
  // than a few seconds of a slightly stepped scrub. On a desktop connection the
  // wait is short, so it holds for all of it and the scrub is never stepped.
  await (windowIsNarrow() ? Promise.race([everything, released]) : everything);
}
