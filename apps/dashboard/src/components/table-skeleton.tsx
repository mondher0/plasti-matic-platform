import { Skeleton } from '@/components/ui/skeleton';
import { TableCell, TableRow } from '@/components/ui/table';

/**
 * Placeholder rows for a <Table> while its query is loading — same column
 * count as the real rows, each cell a skeleton bar. Widths are varied
 * (not just 100%) so the placeholder doesn't look like a single flat block.
 */
export function TableSkeletonRows({ rows = 6, columns }: { rows?: number; columns: number }) {
  const widths = ['w-full', 'w-5/6', 'w-4/6', 'w-3/6'];
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <TableRow key={rowIndex} className="hover:bg-transparent">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <TableCell key={colIndex}>
              <Skeleton className={`h-4 ${widths[(rowIndex + colIndex) % widths.length]}`} />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}
