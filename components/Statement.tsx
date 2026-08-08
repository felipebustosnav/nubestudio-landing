'use client';

import { useCallback, useRef } from 'react';
import type { Viewport } from '@/lib/math';
import {
  CLOUD_ASPECT,
  CLOUD_LINE_SRC,
  PANEL_HINGES,
  PROJECTS,
  PUFF_COUNT,
  STATEMENT_SCROLL_VH,
  STATEMENT_SCROLL_VH_MOBILE,
  WIRE,
  statementFrame,
} from '@/lib/statement';
import { setStatementProgress } from '@/lib/statement-progress';
import { useScrollScene } from '@/lib/use-scroll-scene';
import ObjectsScene, { type ObjectsController } from './ObjectsScene';
import styles from './Statement.module.css';

const PUFFS = Array.from({ length: PUFF_COUNT }, (_, i) => i);

/**
 * The long scene. One pinned ScrollTrigger drives the declaration, the cloud's
 * orbit and zoom, the project grid, the doors, and the object sequence — all on
 * the same held screen.
 */
export default function Statement() {
  const sectionRef = useRef<HTMLElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const solidRef = useRef<HTMLDivElement>(null);
  const doorsRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef<HTMLDivElement>(null);
  const maskRef = useRef<HTMLDivElement>(null);
  const objectsLayerRef = useRef<HTMLDivElement>(null);
  const puffRefs = useRef<(HTMLImageElement | null)[]>([]);
  const panelRefs = useRef<(HTMLElement | null)[]>([]);
  const objectsController = useRef<ObjectsController | null>(null);

  const update = useCallback((raw: number, viewport: Viewport) => {
    const frame = statementFrame(raw, viewport);
    // The nav reads this to know when to step aside for the white panel.
    setStatementProgress(raw);

    if (copyRef.current) {
      copyRef.current.style.opacity = String(frame.statementOpacity);
      copyRef.current.style.transform = `translateY(${frame.statementShift}px)`;
    }
    if (hintRef.current) {
      hintRef.current.style.opacity = String(frame.hintOpacity);
    }
    if (solidRef.current) {
      solidRef.current.style.opacity = String(frame.solidOpacity);
    }

    const { x, y, size, spin } = frame.mask;

    // Narrow screens grow a fixed mask with transform instead — the compositor
    // takes that, where animating mask-size on a full-screen layer repaints.
    if (zoomRef.current) {
      zoomRef.current.style.transform = `translate(${x}px, ${y}px) rotate(${spin}deg) scale(${frame.zoomScale})`;
    }

    const mask = maskRef.current;
    if (mask) {
      mask.style.opacity = String(frame.maskOpacity);
      if (frame.narrow) {
        // A plain black panel here; the cloud that opens it is its own layer.
        mask.style.transform = 'none';
      } else {
        const position = `${x - size / 2}px ${y - size / CLOUD_ASPECT / 2}px`;
        const dimension = `${size}px auto`;
        mask.style.setProperty('mask-position', position);
        mask.style.setProperty('-webkit-mask-position', position);
        mask.style.setProperty('mask-size', dimension);
        mask.style.setProperty('-webkit-mask-size', dimension);
        mask.style.transform = `rotate(${spin}deg)`;
        mask.style.transformOrigin = `${x}px ${y}px`;
      }
    }

    frame.puffs.forEach((puff, i) => {
      const el = puffRefs.current[i];
      if (!el) return;
      if (!puff.visible) {
        el.style.visibility = 'hidden';
        return;
      }
      el.style.visibility = 'visible';
      el.style.left = `${puff.x}px`;
      el.style.top = `${puff.y}px`;
      el.style.width = `${puff.width}px`;
      el.style.height = `${puff.height}px`;
      el.style.opacity = String(puff.opacity);
      el.style.transform = `translate(-50%, -50%) rotate(${puff.rotation}deg)`;
    });

    frame.panels.forEach((panel, i) => {
      const el = panelRefs.current[i];
      if (!el) return;
      el.style.transform = `translateX(${panel.slideX}px) translateX(${panel.pushX}%) rotateY(${panel.rotateY}deg)`;
      el.style.opacity = String(panel.opacity);
      el.style.filter = `brightness(${panel.brightness})`;
      el.style.pointerEvents = panel.interactive ? 'auto' : 'none';
    });

    if (doorsRef.current) {
      // Two halves parting: the black gap widens from the middle until it has
      // the whole card. Display:none above the breakpoint, so this is inert.
      const half = (1 - frame.doorOpen) * 50;
      doorsRef.current.style.clipPath = `inset(0 ${half}% 0 ${half}%)`;
      doorsRef.current.style.opacity = String(frame.doorOpacity);
    }

    if (objectsLayerRef.current) {
      objectsLayerRef.current.style.opacity = frame.objectsProgress > 0 ? '1' : '0';
    }
    objectsController.current?.update(frame.objectsProgress, viewport);
  }, []);

  useScrollScene({
    target: sectionRef,
    start: 'bottom bottom',
    endVh: STATEMENT_SCROLL_VH,
    mobileEndVh: STATEMENT_SCROLL_VH_MOBILE,
    onUpdate: update,
  });

  return (
    <section ref={sectionRef} data-statement="" className={styles.statement}>
      <div ref={copyRef} className={styles.copy}>
        <div className={styles.copyInner}>
          <div className={styles.kicker}>El estudio</div>
          <p className={styles.headline}>
            Trabajamos despacio, con luz natural y pocos materiales.
          </p>
          <p className={styles.lede}>
            Espacio público, equipamiento y vivienda. Dibujamos a mano para entender el lugar y
            renderizamos para comprobarlo: ninguna decisión llega a obra sin haberse caminado
            antes.
          </p>
        </div>
      </div>

      {PUFFS.map((i) => (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          key={i}
          ref={(el) => {
            puffRefs.current[i] = el;
          }}
          className={styles.puff}
          src={CLOUD_LINE_SRC}
          alt=""
          aria-hidden="true"
        />
      ))}

      <div ref={solidRef} className={styles.solid} />

      {/* Sits between the backing black and the mask, so it opens over the
          white copy and the cards still land on top of it. */}
      <div ref={zoomRef} className={styles.zoom} />

      <div ref={maskRef} className={styles.mask}>
        <div ref={objectsLayerRef} className={styles.objectsLayer}>
          <ObjectsScene controllerRef={objectsController} />
        </div>

        <div className={styles.grid}>
          {PROJECTS.map((project, i) => (
            <article
              key={project.title}
              ref={(el) => {
                panelRefs.current[i] = el;
              }}
              className={styles.panel}
              style={{ transformOrigin: `${PANEL_HINGES[i]}% 50%` }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className={styles.panelImage} src={project.src} alt="" />

              <div className={styles.panelLabel}>
                <span className={styles.panelTitle}>
                  {project.title}
                  <span className={styles.panelPlace}>{project.place}</span>
                </span>
                <span className={styles.panelMeta}>
                  {project.program} · {project.year}
                </span>
              </div>

              <svg className={styles.wire} viewBox="0 0 120 120" preserveAspectRatio="xMidYMid meet">
                {WIRE.lines.map(([x1, y1, x2, y2], k) => (
                  <line key={k} x1={x1} y1={y1} x2={x2} y2={y2} vectorEffect="non-scaling-stroke" />
                ))}
                {WIRE.piles.map(([x1, y1, x2, y2], k) => (
                  <line
                    key={`pile-${k}`}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    strokeDasharray="2 3"
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
              </svg>
            </article>
          ))}
        </div>

        <div ref={doorsRef} className={styles.doors} />
      </div>

      <div ref={hintRef} className={styles.hint}>
        Desliza
      </div>
    </section>
  );
}
