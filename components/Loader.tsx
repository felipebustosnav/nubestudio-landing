'use client';

import { useEffect, useState } from 'react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { loadAssets } from '@/lib/assets';
import styles from './Loader.module.css';

/** Matches --dur-slow, the fade-out. */
const FADE_MS = 900;

/**
 * Holds the page still until every frame, photo and webfont is in memory, so
 * the scrub never lands on a frame that has not arrived yet.
 */
export default function Loader() {
  const [fraction, setFraction] = useState(0);
  const [fading, setFading] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    let alive = true;
    const root = document.documentElement;
    const previousRestoration = history.scrollRestoration;

    // A reload must not drop the visitor into the middle of a locked scene.
    history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
    root.classList.add(styles.locked);

    let timer = 0;
    void loadAssets((value) => {
      if (alive) setFraction(value);
    }).then(() => {
      if (!alive) return;
      root.classList.remove(styles.locked);
      // The lock removed the scrollbar; the pins were measured without it.
      ScrollTrigger.refresh();
      setFading(true);
      timer = window.setTimeout(() => {
        if (alive) setGone(true);
      }, FADE_MS);
    });

    return () => {
      alive = false;
      window.clearTimeout(timer);
      root.classList.remove(styles.locked);
      history.scrollRestoration = previousRestoration;
    };
  }, []);

  if (gone) return null;

  return (
    <div
      className={`${styles.loader} ${fading ? styles.done : ''}`}
      role="status"
      aria-live="polite"
    >
      <div className={styles.mark} />
      <div className={styles.track}>
        <div className={styles.bar} style={{ transform: `scaleX(${fraction})` }} />
      </div>
      <div className={styles.caption}>
        <span>Cargando recorrido</span>
        <span className={styles.percent}>{Math.round(fraction * 100)}%</span>
      </div>
    </div>
  );
}
