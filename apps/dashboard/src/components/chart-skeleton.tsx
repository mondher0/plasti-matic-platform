import { Skeleton } from '@/components/ui/skeleton';

/** Placeholder for a chart area while its query is loading — matches the
 *  chart's usual footprint (via `height`) so the layout doesn't jump once
 *  the real chart renders in. */
export function ChartSkeleton({ height = 280 }: { height?: number }) {
  return <Skeleton className="w-full" style={{ height }} />;
}
