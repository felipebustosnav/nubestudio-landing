/**
 * Curve helpers for the scroll scenes. Pure — no DOM, no React, no GSAP.
 */

export interface Viewport {
  w: number;
  h: number;
}

/** Used for the first server render, before the real viewport is known. */
export const DEFAULT_VIEWPORT: Viewport = { w: 1440, h: 900 };

export const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

/** Smoothstep. The easing used across the whole statement scene. */
export const smoothstep = (t: number): number => t * t * (3 - 2 * t);

/** Used by the object sequence for its horizontal entrance. */
export const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

/**
 * Deterministic per-index jitter, so every propulsion puff keeps the same beat
 * on every reload and between server and client.
 */
export const hashNoise = (i: number, seed: number): number => {
  const x = Math.sin((i + 1) * 12.9898 + seed * 78.233) * 43758.5453;
  return x - Math.floor(x);
};
