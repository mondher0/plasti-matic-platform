import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface DateRange {
  from: Date;
  to: Date;
}

const PRESETS = [
  { label: '7 jours', days: 7 },
  { label: '30 jours', days: 30 },
  { label: '90 jours', days: 90 },
];

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

export function DateRangeFilter({
  activeDays,
  onChange,
}: {
  activeDays: number;
  onChange: (range: DateRange, days: number) => void;
}) {
  return (
    <div className="inline-flex items-center rounded-lg border bg-card p-1">
      {PRESETS.map((preset) => (
        <Button
          key={preset.days}
          size="sm"
          variant="ghost"
          className={cn(
            'h-7 px-3 text-xs',
            activeDays === preset.days && 'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground',
          )}
          onClick={() => onChange({ from: daysAgo(preset.days), to: new Date() }, preset.days)}
        >
          {preset.label}
        </Button>
      ))}
    </div>
  );
}

export function defaultRange(days = 30): DateRange {
  return { from: daysAgo(days), to: new Date() };
}
