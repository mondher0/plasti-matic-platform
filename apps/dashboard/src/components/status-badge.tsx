import { AlertTriangle, CheckCircle2, CircleDot, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type Tone = 'good' | 'warning' | 'serious' | 'critical' | 'neutral';

const TONE_STYLES: Record<Tone, { text: string; icon: typeof CheckCircle2 }> = {
  good: { text: 'text-status-good', icon: CheckCircle2 },
  warning: { text: 'text-status-warning', icon: AlertTriangle },
  serious: { text: 'text-status-serious', icon: AlertTriangle },
  critical: { text: 'text-status-critical', icon: XCircle },
  neutral: { text: 'text-muted-foreground', icon: CircleDot },
};

/**
 * Status is always shown as icon + label on a neutral chip — never color
 * alone (per the design system's status-color contrast rules).
 */
export function StatusBadge({ label, tone = 'neutral' }: { label: string; tone?: Tone }) {
  const { text, icon: Icon } = TONE_STYLES[tone];
  return (
    <span
      className={cn(
        'inline-flex w-fit shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md bg-muted px-2 py-1 text-xs font-medium',
        text,
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      {label}
    </span>
  );
}

const ORDER_STATUS_TONE: Record<string, Tone> = {
  PENDING: 'neutral',
  CONFIRMED: 'neutral',
  PROCESSING: 'warning',
  SHIPPED: 'warning',
  DELIVERED: 'good',
  CANCELLED: 'critical',
};

const ORDER_STATUS_LABEL: Record<string, string> = {
  PENDING: 'En attente',
  CONFIRMED: 'Confirmée',
  PROCESSING: 'En préparation',
  SHIPPED: 'Expédiée',
  DELIVERED: 'Livrée',
  CANCELLED: 'Annulée',
};

export function OrderStatusBadge({ status }: { status: string }) {
  return <StatusBadge label={ORDER_STATUS_LABEL[status] ?? status} tone={ORDER_STATUS_TONE[status] ?? 'neutral'} />;
}

const PRODUCTION_STATUS_TONE: Record<string, Tone> = {
  PLANNED: 'neutral',
  IN_PROGRESS: 'warning',
  COMPLETED: 'good',
  CANCELLED: 'critical',
};

const PRODUCTION_STATUS_LABEL: Record<string, string> = {
  PLANNED: 'Planifié',
  IN_PROGRESS: 'En cours',
  COMPLETED: 'Terminé',
  CANCELLED: 'Annulé',
};

export function ProductionStatusBadge({ status }: { status: string }) {
  return (
    <StatusBadge
      label={PRODUCTION_STATUS_LABEL[status] ?? status}
      tone={PRODUCTION_STATUS_TONE[status] ?? 'neutral'}
    />
  );
}
