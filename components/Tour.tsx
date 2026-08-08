'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { getCachedImage, onAssetsReady } from '@/lib/assets';
import {
  TOUR_FRAME_COUNT,
  TOUR_SCROLL_VH,
  TOUR_SCROLL_VH_MOBILE,
  TOUR_STOPS,
  anchorX,
  tourFrame,
  tourFrameAt,
  tourFrameSrc,
  tourPlate,
  type TourPoint,
} from '@/lib/tour';
import { useScrollScene } from '@/lib/use-scroll-scene';
import { windowIsNarrow } from '@/lib/viewport';
import styles from './Tour.module.css';

type CSSVars = CSSProperties & Record<`--${string}`, string>;

/** The note itself, shown pinned to its point on a desktop and in the band
 *  under the picture on a phone. */
function Note({ point }: { point: TourPoint }) {
  return (
    <>
      <div className={styles.cardHead}>
        <span className={styles.cardIndex}>{point.index}</span>
        <span className={styles.cardLabel}>{point.label}</span>
      </div>
      <p className={styles.cardNote}>{point.note}</p>
    </>
  );
}

interface AnnotationProps {
  point: TourPoint;
  /** Position within the stop, for the entrance stagger. */
  order: number;
  open: boolean;
  /** Anchor x within the picture, already mapped through the mobile crop. */
  x: number;
  onToggle: () => void;
}

/**
 * Collapsed, it is a clickable marker carrying the number and the name of what
 * it points at. Clicking it retracts the label to a dot, draws the leader line
 * and opens the note.
 */
function Annotation({ point, order, open, x, onToggle }: AnnotationProps) {
  const length = Math.hypot(point.dx, point.dy);
  const angle = (Math.atan2(point.dy, point.dx) * 180) / Math.PI;
  const noteId = `tour-note-${point.index}`;
  const vars: CSSVars = {
    left: `${x * 100}%`,
    top: `${point.y * 100}%`,
    '--len': `${length}px`,
    '--angle': `${angle}deg`,
    '--dx': `${point.dx}px`,
    '--dy': `${point.dy}px`,
    '--delay': `${order * 180}ms`,
  };

  return (
    <div className={`${styles.annotation} ${open ? styles.open : ''}`} style={vars}>
      <button
        type="button"
        className={styles.point}
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={noteId}
      >
        <span className={styles.ring}>
          <span className={styles.pip} />
        </span>
        <span className={styles.index}>{point.index}</span>
        <span className={styles.chip}>{point.label}</span>
      </button>

      <span className={styles.hairline} />

      <div id={noteId} className={styles.card} aria-hidden={!open}>
        <Note point={point} />
      </div>
    </div>
  );
}

export default function Tour() {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const percentRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const markRefs = useRef<(HTMLSpanElement | null)[]>([]);

  const paintedRef = useRef(-1);
  const progressRef = useRef(0);
  const activeStopRef = useRef(-1);

  const [activeStop, setActiveStop] = useState(-1);
  const [openPoint, setOpenPoint] = useState<string | null>(null);
  // Starts false so the server and the first client render agree; the loading
  // screen is still up when it corrects itself a tick later.
  const [narrow, setNarrow] = useState(false);

  const draw = useCallback((frame: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let index = Math.max(1, Math.min(TOUR_FRAME_COUNT, Math.round(frame)));
    let image = getCachedImage(tourFrameSrc(index));
    if (!image) {
      // Nearest decoded neighbour, in case a frame failed to load.
      for (let d = 1; d < TOUR_FRAME_COUNT; d++) {
        const before = index - d >= 1 ? getCachedImage(tourFrameSrc(index - d)) : undefined;
        if (before) {
          index -= d;
          image = before;
          break;
        }
        const after =
          index + d <= TOUR_FRAME_COUNT ? getCachedImage(tourFrameSrc(index + d)) : undefined;
        if (after) {
          index += d;
          image = after;
          break;
        }
      }
    }
    if (!image || index === paintedRef.current) return;
    paintedRef.current = index;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.round(canvas.clientWidth * dpr);
    const height = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // A phone gets the 4:5 plate across the top and keeps the rest black for
    // the words; a desktop fills its whole box as it always has.
    const box = windowIsNarrow()
      ? tourPlate(canvas.width, canvas.height)
      : { x: 0, y: 0, w: canvas.width, h: canvas.height };

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const scale = Math.max(box.w / image.naturalWidth, box.h / image.naturalHeight);
    const dw = image.naturalWidth * scale;
    const dh = image.naturalHeight * scale;
    ctx.save();
    ctx.beginPath();
    ctx.rect(box.x, box.y, box.w, box.h);
    ctx.clip();
    ctx.drawImage(image, box.x + (box.w - dw) / 2, box.y + (box.h - dh) / 2, dw, dh);
    ctx.restore();
  }, []);

  const repaint = useCallback(() => {
    paintedRef.current = -1;
    draw(tourFrameAt(progressRef.current));
  }, [draw]);

  const update = useCallback(
    (progress: number) => {
      progressRef.current = progress;
      const frame = tourFrame(progress);
      draw(frame.frame);

      if (canvasRef.current) {
        canvasRef.current.style.filter = `grayscale(${frame.grayscale}) contrast(${frame.contrast}) saturate(${frame.saturate})`;
      }
      if (titleRef.current) {
        titleRef.current.style.opacity = String(frame.titleOpacity);
        titleRef.current.style.transform = `translateY(${frame.titleShift}px)`;
      }
      if (percentRef.current) {
        percentRef.current.textContent = `${String(frame.percent).padStart(2, '0')}%`;
      }
      if (barRef.current) {
        barRef.current.style.width = `${frame.percent}%`;
      }
      TOUR_STOPS.forEach((stop, i) => {
        markRefs.current[i]?.classList.toggle(styles.markPassed, progress >= stop.from);
      });

      // Edge-triggered: the only per-tick work React does is when a stop opens
      // or closes, which happens a handful of times across the whole tour.
      const next = TOUR_STOPS.findIndex((s) => progress >= s.from && progress <= s.to);
      if (next !== activeStopRef.current) {
        activeStopRef.current = next;
        setActiveStop(next);
        setOpenPoint(null);
      }
    },
    [draw],
  );

  useEffect(() => onAssetsReady(repaint), [repaint]);

  useEffect(() => {
    const onResize = () => {
      setNarrow(windowIsNarrow());
      repaint();
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [repaint]);

  useScrollScene({
    target: sectionRef,
    start: 'top top',
    endVh: TOUR_SCROLL_VH,
    mobileEndVh: TOUR_SCROLL_VH_MOBILE,
    onUpdate: update,
  });

  const openNote =
    activeStop >= 0
      ? (TOUR_STOPS[activeStop].points.find((p) => p.index === openPoint) ?? null)
      : null;

  return (
    <section
      ref={sectionRef}
      data-hero="tour"
      className={`${styles.tour} ${openNote ? styles.noteOpen : ''}`}
    >
      <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
      <div className={styles.vignette} />

      <div ref={titleRef} className={styles.title}>
        <h1 className={styles.heading}>
          POR ENCIMA
          <br />
          DE LAS NUBES
        </h1>
        <p className={styles.lede}>
          Proyectamos espacio público, equipamiento y vivienda con una economía deliberada de
          materiales. 
        </p>
      </div>

      {TOUR_STOPS.map((stop, i) => (
        <div
          key={stop.id}
          className={`${styles.stop} ${activeStop === i ? styles.stopActive : ''}`}
        >
          {stop.points.map((point, k) => (
            <Annotation
              key={point.index}
              point={point}
              order={k}
              x={anchorX(point.x, narrow)}
              open={openPoint === point.index}
              onToggle={() =>
                setOpenPoint((current) => (current === point.index ? null : point.index))
              }
            />
          ))}
          {stop.caption && (
            <div className={styles.caption}>
              <div className={styles.captionLabel}>{stop.label}</div>
              <p className={styles.captionText}>{stop.caption}</p>
            </div>
          )}
        </div>
      ))}

      {/* On a phone the pinned card would land off-screen — the note moves to
          the band under the picture instead. Hidden above the breakpoint. */}
      <div className={styles.sheet} aria-hidden={!openNote}>
        {openNote && <Note point={openNote} />}
      </div>

      <div className={styles.meta}>
        <span>Residencia Voladizo · Recorrido en render</span>
        <span ref={percentRef} className={styles.metaPercent}>
          00%
        </span>
      </div>

      <div className={styles.track}>
        <div ref={barRef} className={styles.bar} />
      </div>
      <div className={styles.marks} aria-hidden="true">
        {TOUR_STOPS.map((stop, i) => (
          <span
            key={stop.id}
            ref={(el) => {
              markRefs.current[i] = el;
            }}
            className={styles.mark}
            style={{ left: `${((stop.from + stop.to) / 2) * 100}%` }}
          />
        ))}
      </div>
    </section>
  );
}
