import type { Viewport } from './math';

/**
 * Where the scenes switch to their mobile arrangement. Below this width the
 * pure frame functions take a different branch; at or above it they run exactly
 * the code they have always run, so the desktop composition cannot drift.
 *
 * Kept in step with the `@media (max-width: 767px)` blocks in the stylesheets.
 */
export const NARROW = 768;

export const isNarrow = (vp: Viewport): boolean => vp.w < NARROW;

/** For the few places that branch outside a scene tick, with no viewport to hand. */
export const windowIsNarrow = (): boolean =>
  typeof window !== 'undefined' && window.innerWidth < NARROW;
