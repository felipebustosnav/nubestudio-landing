'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import gsap from 'gsap';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
import { travelSeconds } from '@/lib/scene-navigation';
import styles from './Footer.module.css';

const VIDEO_SRC = '/assets/footer/footer.mp4';

type CSSVars = CSSProperties & Record<`--${string}`, string>;

/** One wave, so the closing line and the trigger read as a single block. */
const delay = (ms: number): CSSVars => ({ '--delay': `${ms}ms` });

export default function Footer() {
  const footerRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [revealed, setRevealed] = useState(false);
  const [open, setOpen] = useState(false);

  // The loop lives at the very bottom of a very long page, so it is left out
  // of the preloader and only fetched once it is nearly in view.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // React does not always reflect `muted` onto the element, and autoplay
    // depends on it.
    video.muted = true;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          void video.play().catch(() => {
            // Autoplay refused: the still first frame is a fine fallback.
          });
        } else {
          video.pause();
        }
      },
      { rootMargin: '300px' },
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  // Reveals once and stays revealed — scrolling back up should not replay it.
  useEffect(() => {
    const footer = footerRef.current;
    if (!footer) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );

    observer.observe(footer);
    return () => observer.disconnect();
  }, []);

  const toTop = useCallback(() => {
    gsap.registerPlugin(ScrollToPlugin);
    gsap.to(window, {
      duration: travelSeconds(window.scrollY, window.innerHeight),
      ease: 'power2.inOut',
      scrollTo: { y: 0, autoKill: true },
    });
  }, []);

  return (
    <footer ref={footerRef} data-dark="" className={styles.footer}>
      <video
        ref={videoRef}
        className={styles.video}
        src={VIDEO_SRC}
        muted
        loop
        playsInline
        preload="none"
        aria-hidden="true"
        tabIndex={-1}
      />
      <div className={styles.veil} />

      <div className={`${styles.inner} ${revealed ? styles.revealed : ''}`}>
        <div className={styles.top}>
          <p className={`${styles.closing} ${styles.reveal}`} style={delay(0)}>
            Cuéntanos qué lugar tienes en mente
          </p>

          {/* Hover opens it on a pointer; the click keeps it usable on touch,
              where there is no hover to rely on. */}
          <div
            className={`${styles.contact} ${open ? styles.open : ''} ${styles.reveal}`}
            style={delay(160)}
            onMouseLeave={() => setOpen(false)}
          >
            <span className={styles.box} aria-hidden="true" />

            <button
              type="button"
              className={styles.trigger}
              aria-expanded={open}
              onClick={() => setOpen((value) => !value)}
            >
              Contacto
            </button>

            <div className={styles.drawer}>
              <div className={styles.drawerInner}>
                <address className={styles.details}>
                  <a className={styles.email} href="mailto:hola@nubestudio.cl">
                    hola@nubestudio.cl
                  </a>
                  <a className={styles.phone} href="tel:+56229771840">
                    +56 2 2977 1840
                  </a>
                  <span className={styles.place}>Merced 152, Santiago</span>
                </address>
              </div>
            </div>
          </div>
        </div>

        <div className={`${styles.rule} ${styles.reveal}`} style={delay(300)} />

        <div className={`${styles.bottom} ${styles.reveal}`} style={delay(380)}>
          <span className={styles.wordmark}>Nube Studio</span>
          <span className={styles.role}>Arquitectura y espacio público</span>
          <button type="button" className={styles.toTop} onClick={toTop}>
            Volver arriba
          </button>
        </div>
      </div>
    </footer>
  );
}
