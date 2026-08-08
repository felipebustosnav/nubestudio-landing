import { useEffect, useLayoutEffect } from 'react';

/**
 * useLayoutEffect on the client, useEffect on the server. Scroll scenes have to
 * paint their first frame before the browser does, but must not warn in SSR.
 */
export const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;
