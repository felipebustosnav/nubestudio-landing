'use client';

import { Fragment, useCallback, useRef, type CSSProperties } from 'react';
import type { Viewport } from '@/lib/math';
import { OBJECTS, OBJECTS_SCROLL_VH, imageLeft, objectFrames, textLeft } from '@/lib/objects';
import { isNarrow } from '@/lib/viewport';
import { useIsomorphicLayoutEffect } from '@/lib/use-isomorphic-layout-effect';
import { useScrollScene } from '@/lib/use-scroll-scene';
import styles from './ObjectsScene.module.css';

type CSSVars = CSSProperties & Record<`--${string}`, string>;

export interface ObjectsController {
  update: (progress: number, viewport: Viewport) => void;
}

interface ObjectsSceneProps {
  /**
   * Handed in by the statement, which owns the pin and feeds progress. Without
   * it the sequence creates its own pinned scene and runs standalone.
   */
  controllerRef?: { current: ObjectsController | null };
}

/**
 * Four pieces. Each caption rides from below the fold to above it without ever
 * pausing; the image slides in from the opposite side, holds still, and fades
 * out where it stands as the next caption starts to climb.
 */
export default function ObjectsScene({ controllerRef }: ObjectsSceneProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const imageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const textRefs = useRef<(HTMLDivElement | null)[]>([]);
  const embedded = Boolean(controllerRef);

  const update = useCallback((progress: number, viewport: Viewport) => {
    const narrow = isNarrow(viewport);
    // Stacked, the plate hangs by its bottom edge and the words by their top,
    // so the gap between them holds however tall the picture happens to be.
    const imageAnchor = narrow ? 'translate(-50%, -100%)' : 'translate(-50%, -50%)';
    const textAnchor = narrow ? 'translate(-50%, 0)' : '';

    objectFrames(progress, viewport).forEach((frame, i) => {
      const image = imageRefs.current[i];
      if (image) {
        image.style.visibility = frame.visible ? 'visible' : 'hidden';
        if (frame.visible) {
          image.style.width = `${frame.imageWidth}px`;
          image.style.transform = `${imageAnchor} translate(${frame.imageX}px, ${frame.imageY}px)`;
          image.style.opacity = String(frame.imageOpacity);
        }
      }
      const text = textRefs.current[i];
      if (text) {
        text.style.visibility = frame.visible ? 'visible' : 'hidden';
        if (frame.visible) {
          text.style.transform = `${textAnchor} translateY(${frame.textY}px)`;
          text.style.opacity = String(frame.textOpacity);
        }
      }
    });
  }, []);

  useIsomorphicLayoutEffect(() => {
    if (!controllerRef) return;
    controllerRef.current = { update };
    return () => {
      controllerRef.current = null;
    };
  }, [controllerRef, update]);

  useScrollScene({
    target: sectionRef,
    start: 'top top',
    endVh: OBJECTS_SCROLL_VH,
    onUpdate: update,
    enabled: !embedded,
  });

  return (
    <section
      ref={sectionRef}
      data-objects={embedded ? undefined : ''}
      className={`${styles.objects} ${embedded ? styles.embedded : ''}`}
    >
      <div className={styles.kicker}>Del detalle al conjunto</div>

      {OBJECTS.map((object, i) => (
        <Fragment key={object.title}>
          <div
            ref={(el) => {
              imageRefs.current[i] = el;
            }}
            className={styles.image}
            /* A variable rather than `left` itself, so the media query can
               override the placement without fighting an inline style. */
            style={{ '--x': imageLeft(i) } as CSSVars}
          >
            {/* Sized and placed by the scene on every tick — next/image would
                only add a layout box around it. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={object.src} alt="" style={{ aspectRatio: object.aspect }} />
          </div>

          <div
            ref={(el) => {
              textRefs.current[i] = el;
            }}
            className={styles.text}
            style={{ '--x': textLeft(i) } as CSSVars}
          >
            <div className={styles.title}>{object.title}</div>
            <p className={styles.note}>{object.note}</p>
          </div>
        </Fragment>
      ))}
    </section>
  );
}
