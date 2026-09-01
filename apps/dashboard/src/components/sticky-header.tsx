import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Pins a page's header block (title, primary action, search/filters) to the
 * top of <main>'s scroll area, so only the table/content below it scrolls.
 * <main> itself carries no top padding (see dashboard-layout.tsx) — this
 * component supplies it instead (pt-4/md:pt-6), so its stuck position lines
 * up exactly with <main>'s clip boundary with zero gap between them.
 *
 * Two earlier versions of this got the gap wrong in opposite directions:
 * - v1 used `bg-muted/30` (30% opacity) — scrolled-away rows showed straight
 *   through the translucent background.
 * - v2 fixed that but used negative margins (`-mx-4 -mt-4`) to cancel
 *   <main>'s top padding from *inside* an extra plain wrapper `<div>` each
 *   page adds around this component. That negative margin collapsed through
 *   the wrapper into <main>'s padding and corrupted the sticky threshold
 *   itself: it rendered correctly at scrollTop 0 but then never actually
 *   moved on scroll (confirmed with getBoundingClientRect before/after —
 *   identical). Even after dropping the negative margin, keeping the top
 *   padding on <main> left a gap between <main>'s clip boundary and the
 *   sticky header's stuck position, which is exactly wide enough for a
 *   scrolled-away row to keep peeking through above the header.
 *
 * Background MUST be fully opaque (not e.g. `bg-muted/30`) for the same
 * peeking-through reason.
 */
export function StickyHeader({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('sticky top-0 z-10 space-y-4 bg-background pb-4 pt-6 md:pt-8', className)}>{children}</div>
  );
}
