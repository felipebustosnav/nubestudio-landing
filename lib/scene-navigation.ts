import { DOORS_END, OBJECTS_FROM, OBJECTS_FROM_NARROW } from './statement';
import { windowIsNarrow } from './viewport';

/**
 * The nav's three destinations. Only the tour is a section of its own: the
 * project grid and the closing sequence are moments inside the statement's
 * single pinned scene, so reaching them means scrolling to a point along its
 * pin rather than to an element.
 */
export type SceneId = 'tour' | 'projects' | 'about';

export interface SceneGeometry {
  /** Document offset where the tour pin begins. */
  tourStart: number;
  /** Document offset where the statement pin begins. */
  statementStart: number;
  /** Scroll distance the statement pin spans. */
  statementLength: number;
}

/**
 * Where each destination sits, given as progress within its own act so the
 * two stay correct if the acts are ever re-timed. 0.84 of the first act has
 * every panel landed with the doors still shut (they swing at 0.86); 0.09 of
 * the closing sequence has its first plate fully in place.
 */
const PROJECTS_IN_ACT = 0.84;
const ABOUT_IN_ACT = 0.09;

/**
 * Narrow screens show the cards one at a time, so 0.84 would drop the visitor
 * on the last one with the sequence already over. 0.4 lands on the first, just
 * after it has settled.
 */
const PROJECTS_IN_ACT_NARROW = 0.4;

const targetProgress = (id: Exclude<SceneId, 'tour'>): number => {
  const narrow = windowIsNarrow();
  if (id === 'projects') return (narrow ? PROJECTS_IN_ACT_NARROW : PROJECTS_IN_ACT) * DOORS_END;
  const from = narrow ? OBJECTS_FROM_NARROW : OBJECTS_FROM;
  return from + ABOUT_IN_ACT * (1 - from);
};

/**
 * Measured from the pin spacers rather than from the scroll constants, so the
 * nav cannot drift out of step with what ScrollTrigger actually laid out.
 */
export function readSceneGeometry(): SceneGeometry | null {
  const hero = document.querySelector('[data-hero]');
  const statement = document.querySelector('[data-statement]');
  if (!hero || !statement) return null;

  const heroBox = hero.closest('.pin-spacer') ?? hero;
  const statementBox = statement.closest('.pin-spacer') ?? statement;
  const offsetTop = (el: Element) => el.getBoundingClientRect().top + window.scrollY;

  return {
    tourStart: offsetTop(heroBox),
    // Pinned on `bottom bottom` over a full-height section, so the pin begins
    // exactly where the spacer does.
    statementStart: offsetTop(statementBox),
    statementLength: statementBox.getBoundingClientRect().height - window.innerHeight,
  };
}

export function scrollTargetFor(id: SceneId, geometry: SceneGeometry): number {
  if (id === 'tour') return geometry.tourStart;
  return geometry.statementStart + targetProgress(id) * geometry.statementLength;
}

/**
 * Travel time for a jump, scaled by distance but sub-linearly: crossing the
 * whole scene has to be slow enough to read what goes by, while a hop between
 * neighbouring sections stays brisk. Distance is counted in screens, so the
 * pacing holds on any viewport.
 */
export function travelSeconds(distance: number, viewportHeight: number): number {
  const screens = Math.abs(distance) / Math.max(1, viewportHeight);
  return Math.min(2.8, Math.max(1, 0.9 + 0.44 * Math.sqrt(screens)));
}

export function activeSceneAt(scrollY: number, geometry: SceneGeometry): SceneId {
  if (scrollY < geometry.statementStart) return 'tour';
  // The handover is the moment the doors finish clearing the screen.
  const progress = (scrollY - geometry.statementStart) / geometry.statementLength;
  return progress < DOORS_END ? 'projects' : 'about';
}
