'use client';

import { useRef, type RefObject } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { DEFAULT_VIEWPORT, type Viewport } from './math';
import { useIsomorphicLayoutEffect } from './use-isomorphic-layout-effect';
import { NARROW } from './viewport';

export interface ScrollSceneOptions {
  target: RefObject<HTMLElement | null>;
  /** ScrollTrigger start, e.g. 'top top' or 'bottom bottom'. */
  start: string;
  /**
   * Scroll length in viewport heights. Measured in px on every refresh rather
   * than handed to ScrollTrigger as a percentage, so the pacing of the scene
   * stays the same on a laptop and on a tall monitor.
   */
  endVh: number;
  /**
   * Scroll length below NARROW, where the same choreography has to be covered
   * in far fewer thumb flicks. Falls back to endVh when absent.
   */
  mobileEndVh?: number;
  /** Called on every scroll tick with progress 0→1 and the live viewport. */
  onUpdate: (progress: number, viewport: Viewport) => void;
  enabled?: boolean;
}

/**
 * A pinned, scrubbed ScrollTrigger that drives the DOM imperatively. Nothing
 * here goes through React state: the scene repaints on every scroll tick and a
 * re-render per tick would drop frames.
 */
export function useScrollScene({
  target,
  start,
  endVh,
  mobileEndVh,
  onUpdate,
  enabled = true,
}: ScrollSceneOptions): void {
  const handler = useRef(onUpdate);
  useIsomorphicLayoutEffect(() => {
    handler.current = onUpdate;
  });

  useIsomorphicLayoutEffect(() => {
    const element = target.current;
    if (!enabled || !element) return;

    gsap.registerPlugin(ScrollTrigger);
    // A mobile URL bar collapsing changes innerHeight mid-scroll. Without this
    // every pin re-measures and jumps as the bar comes and goes.
    ScrollTrigger.config({ ignoreMobileResize: true });

    // One object, mutated in place — consumers read it synchronously.
    const viewport: Viewport = { ...DEFAULT_VIEWPORT };
    const measure = () => {
      viewport.w = window.innerWidth;
      // The pinned box rather than the window: on narrow screens the sections
      // are sized in svh, and the scene maths has to agree with the box it
      // paints into. On desktop the box is 100vh, so this is innerHeight.
      viewport.h = element.clientHeight || window.innerHeight;
    };
    measure();

    const lengthVh = () =>
      mobileEndVh !== undefined && window.innerWidth < NARROW ? mobileEndVh : endVh;

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: element,
        start,
        end: () => `+=${window.innerHeight * lengthVh()}`,
        pin: true,
        pinSpacing: true,
        scrub: true,
        invalidateOnRefresh: true,
        onUpdate: (self) => handler.current(self.progress, viewport),
        onRefresh: (self) => {
          measure();
          handler.current(self.progress, viewport);
        },
      });
    }, element);

    handler.current(0, viewport);
    return () => ctx.revert();
  }, [enabled, start, endVh, mobileEndVh, target]);
}
