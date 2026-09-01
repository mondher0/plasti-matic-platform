import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface KpiCardProps {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  isLoading?: boolean;
  tone?: 'default' | 'warning' | 'critical';
}

const toneClasses: Record<NonNullable<KpiCardProps['tone']>, string> = {
  default: 'bg-primary/10 text-primary',
  warning: 'bg-status-warning/15 text-status-warning',
  critical: 'bg-status-critical/15 text-status-critical',
};

/** The atomic building block of every KPI grid in the dashboard. */
export function KpiCard({ label, value, hint, icon: Icon, isLoading, tone = 'default' }: KpiCardProps) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-4 p-5">
        <div className="min-w-0 space-y-1.5">
          <p className="text-sm text-muted-foreground">{label}</p>
          {isLoading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <p className="text-2xl font-semibold tracking-tight">{value}</p>
          )}
          {hint && <p className="truncate text-xs text-muted-foreground">{hint}</p>}
        </div>
        <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', toneClasses[tone])}>
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}
