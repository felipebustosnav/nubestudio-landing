import Statement from './Statement';
import Tour from './Tour';

/**
 * The whole homepage: a 120-frame pinned tour, then the statement — one long
 * pinned scene that carries the cloud, the project grid, the doors and the
 * object sequence.
 */
export default function Homepage() {
  return (
    <>
      <Tour />
      <Statement />
    </>
  );
}
