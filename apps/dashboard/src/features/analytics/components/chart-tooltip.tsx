import type { TooltipProps } from 'recharts';

/**
 * Recharts' default tooltip is a plain white box that ignores our theme.
 * This renders on the same surface/border/ink tokens as the rest of the UI
 * so it looks correct in both light and dark mode.
 */
export function ChartTooltip({ active, payload, label, formatter }: TooltipProps<number, string> & { formatter?: (value: number, name: string) => string }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
      {label !== undefined && <p className="mb-1 font-medium">{label}</p>}
      <div className="space-y-0.5">
        {payload.map((entry) => (
          <div key={entry.dataKey as string} className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-medium">
              {formatter ? formatter(entry.value as number, entry.name as string) : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
