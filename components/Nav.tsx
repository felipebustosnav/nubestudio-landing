'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import gsap from 'gsap';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  activeSceneAt,
  readSceneGeometry,
  scrollTargetFor,
  travelSeconds,
  type SceneGeometry,
  type SceneId,
} from '@/lib/scene-navigation';
import { getStatementProgress } from '@/lib/statement-progress';
import styles from './Nav.module.css';

type NavMode = 'hero' | 'light' | 'dark' | 'hidden';
type CSSVars = CSSProperties & Record<`--${string}`, string>;

/** Where the bar sits, in px from the top of the viewport. */
const BAR_Y = 80;

/** One wave for the sheet's contents. */
const delay = (ms: number): CSSVars => ({ '--delay': `${ms}ms` });

const LINKS: readonly { id: SceneId; label: string }[] = [
  { id: 'tour', label: 'Tour' },
  { id: 'projects', label: 'Proyectos' },
  { id: 'about', label: 'Sobre nosotros' },
];

/**
 * Reads the sections under the bar rather than a scroll offset, so the pinned
 * scenes and their spacers cannot desynchronise it.
 */
function readMode(): NavMode {
  const statement = document.querySelector('[data-statement]');
  if (statement) {
    const rect = statement.getBoundingClientRect();
    if (rect.top < BAR_Y && rect.bottom > BAR_Y) {
      // Hidden over the white panel; back in white once the cloud's black lands.
      return getStatementProgress() > 0.19 ? 'dark' : 'hidden';
    }
  }

  // The object sequence when it runs on its own pin, plus the footer and
  // anything else that opts into light lettering over a dark ground.
  for (const node of document.querySelectorAll('[data-objects], [data-dark]')) {
    const box = node.closest('.pin-spacer') ?? node;
    const rect = box.getBoundingClientRect();
    if (rect.top < BAR_Y && rect.bottom > BAR_Y) return 'dark';
  }

  const hero = document.querySelector('[data-hero]');
  if (hero) {
    const box = hero.closest('.pin-spacer') ?? hero;
    if (box.getBoundingClientRect().bottom > BAR_Y + 10) return 'hero';
  }

  return 'light';
}

export default function Nav() {
  const [mode, setMode] = useState<NavMode>('hero');
  const [active, setActive] = useState<SceneId>('tour');
  const [open, setOpen] = useState(false);
  const geometryRef = useRef<SceneGeometry | null>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

    // Measuring hits layout, so it happens on refresh rather than per tick.
    const measure = () => {
      geometryRef.current = readSceneGeometry();
    };
    const check = () => {
      setMode(readMode());
      const geometry = geometryRef.current;
      if (geometry) setActive(activeSceneAt(window.scrollY, geometry));
    };

    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(check);
    };

    measure();
    check();
    // The pins settle a tick after mount; re-read once they have.
    const settle = window.setTimeout(() => {
      measure();
      check();
    }, 60);

    // Fires whenever the pins are recalculated — including when the loading
    // screen releases the page and refreshes them.
    ScrollTrigger.addEventListener('refresh', measure);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    return () => {
      window.clearTimeout(settle);
      cancelAnimationFrame(frame);
      ScrollTrigger.removeEventListener('refresh', measure);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  // The sheet is the only thing Escape could mean while it is up.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const goTo = useCallback((id: SceneId) => {
    setOpen(false);
    const geometry = geometryRef.current ?? readSceneGeometry();
    if (!geometry) return;
    geometryRef.current = geometry;
    const y = scrollTargetFor(id, geometry);
    gsap.to(window, {
      duration: travelSeconds(y - window.scrollY, window.innerHeight),
      ease: 'power2.inOut',
      // autoKill hands control back the moment the visitor scrolls themselves.
      scrollTo: { y, autoKill: true },
    });
  }, []);

  const inverse = mode === 'hero' || mode === 'dark' || mode === 'hidden';
  // The bar steps aside for the white panel, but never while the sheet is up.
  const suppressed = mode === 'hidden' && !open;
  const className = [
    styles.nav,
    inverse && styles.inverse,
    suppressed && styles.hidden,
    open && styles.open,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <nav className={className} aria-hidden={suppressed}>
      <a
        className={styles.wordmark}
        href="/"
        onClick={(event) => {
          // Plain clicks scroll home; modified clicks still open the route.
          if (event.metaKey || event.ctrlKey || event.shiftKey) return;
          event.preventDefault();
          goTo('tour');
        }}
      >
        Nube Studio
      </a>

      <div className={styles.links}>
        {LINKS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            className={`${styles.link} ${active === id ? styles.active : ''}`}
            aria-current={active === id ? 'true' : undefined}
            onClick={() => goTo(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Only ever reachable below the breakpoint — the button is display:none
          above it, so the sheet cannot open on a desktop. */}
      <button
        type="button"
        className={styles.burger}
        aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
        aria-expanded={open}
        aria-controls="nav-sheet"
        onClick={() => setOpen((value) => !value)}
      >
        <span className={styles.burgerLine} />
        <span className={styles.burgerLine} />
      </button>

      <div id="nav-sheet" className={styles.sheet} aria-hidden={!open}>
        <div className={styles.sheetLinks}>
          {LINKS.map(({ id, label }, i) => (
            <button
              key={id}
              type="button"
              className={`${styles.sheetLink} ${active === id ? styles.sheetActive : ''}`}
              style={delay(90 + i * 70)}
              aria-current={active === id ? 'true' : undefined}
              tabIndex={open ? undefined : -1}
              onClick={() => goTo(id)}
            >
              {label}
            </button>
          ))}
        </div>

        <a
          className={styles.sheetMail}
          href="mailto:hola@nubestudio.cl"
          style={delay(90 + LINKS.length * 70)}
          tabIndex={open ? undefined : -1}
        >
          hola@nubestudio.cl
        </a>
      </div>
    </nav>
  );
}
