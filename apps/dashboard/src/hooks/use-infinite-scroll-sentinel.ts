import { useEffect, useRef } from 'react';

/**
 * Returns a ref to attach to a sentinel element placed at the bottom of a
 * scrollable list. When it scrolls into view, `onIntersect` fires (typically
 * `fetchNextPage`). `root` should be the scrollable container itself (not
 * the window) since these lists scroll inside a fixed-height Card, not the
 * page — IntersectionObserver defaults to the viewport otherwise, which
 * would never trigger since the container clips the sentinel first.
 */
export function useInfiniteScrollSentinel<T extends HTMLElement>(
  onIntersect: () => void,
  { enabled = true, root }: { enabled?: boolean; root?: HTMLElement | null } = {},
) {
  const sentinelRef = useRef<T>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !enabled) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onIntersect();
      },
      { root: root ?? null, rootMargin: '200px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, root, onIntersect]);

  return sentinelRef;
}
