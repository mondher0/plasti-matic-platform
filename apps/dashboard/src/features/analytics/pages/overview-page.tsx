import { useState } from 'react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  BarChart,
  Legend,
} from 'recharts';
import { AlertTriangle, Boxes, DollarSign, Factory, Package, ShoppingCart } from 'lucide-react';
import { formatCurrency } from '@plastimatic/shared';
import { PageHeader } from '@/components/page-header';
import { StickyHeader } from '@/components/sticky-header';
import { KpiCard } from '@/components/kpi-card';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChartSkeleton } from '@/components/chart-skeleton';
import {
  useOrdersByStatus,
  useOverviewKpis,
  useRevenueTrend,
  useStockByCategory,
} from '../api/analytics-api';
import { useLowStock } from '@/features/inventory/api/inventory-api';
import { ChartCard } from '../components/chart-card';
import { ChartTooltip } from '../components/chart-tooltip';
import { HorizontalTruncatedTick } from '../components/chart-ticks';
import { DateRangeFilter, defaultRange } from '../components/date-range-filter';

const ORDER_STATUS_LABEL: Record<string, string> = {
  PENDING: 'En attente',
  CONFIRMED: 'Confirmée',
  PROCESSING: 'Préparation',
  SHIPPED: 'Expédiée',
  DELIVERED: 'Livrée',
  CANCELLED: 'Annulée',
};

export function OverviewPage() {
  const [days, setDays] = useState(30);
  const [range, setRange] = useState(defaultRange(30));

  const overview = useOverviewKpis(range);
  const revenueTrend = useRevenueTrend(range);
  const ordersByStatus = useOrdersByStatus();
  const stockByCategory = useStockByCategory();
  const lowStock = useLowStock();

  return (
    <div>
      <StickyHeader>
        <PageHeader
          title="Vue d'ensemble"
          description="Indicateurs clés de stock, production et ventes"
          actions={<DateRangeFilter activeDays={days} onChange={(r, d) => { setRange(r); setDays(d); }} />}
        />
      </StickyHeader>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Valeur du stock"
          value={formatCurrency(overview.data?.totalStockValue ?? 0)}
          icon={Boxes}
          isLoading={overview.isLoading}
          hint="Quantité × coût de revient"
        />
        <KpiCard
          label="Revenu (période)"
          value={formatCurrency(overview.data?.revenueInPeriod ?? 0)}
          icon={DollarSign}
          isLoading={overview.isLoading}
          hint={`${overview.data?.ordersInPeriod ?? 0} commande(s)`}
        />
        <KpiCard
          label="Panier moyen"
          value={formatCurrency(overview.data?.averageOrderValue ?? 0)}
          icon={ShoppingCart}
          isLoading={overview.isLoading}
        />
        <KpiCard
          label="Alertes stock bas"
          value={String(overview.data?.lowStockCount ?? 0)}
          icon={AlertTriangle}
          isLoading={overview.isLoading}
          tone={(overview.data?.lowStockCount ?? 0) > 0 ? 'warning' : 'default'}
          hint="Sous le seuil d'alerte"
        />
        <KpiCard
          label="Produits / SKUs"
          value={`${overview.data?.totalProducts ?? 0} / ${overview.data?.totalSkus ?? 0}`}
          icon={Package}
          isLoading={overview.isLoading}
        />
        <KpiCard
          label="Unités en stock"
          value={(overview.data?.totalUnitsInStock ?? 0).toLocaleString('fr-FR')}
          icon={Boxes}
          isLoading={overview.isLoading}
        />
        <KpiCard
          label="Production (période)"
          value={`${(overview.data?.productionOutputInPeriod ?? 0).toLocaleString('fr-FR')} u.`}
          icon={Factory}
          isLoading={overview.isLoading}
          hint="Lots terminés"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartCard
          title="Revenu quotidien & tendance"
          description="Revenu journalier avec moyenne mobile sur 7 jours"
          className="lg:col-span-2"
        >
          {revenueTrend.isLoading ? (
            <ChartSkeleton height={280} />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={revenueTrend.data ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={{ stroke: 'hsl(var(--border))' }} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} width={40} />
                <Tooltip content={<ChartTooltip formatter={(v) => formatCurrency(v)} />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="revenue" name="Revenu" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Stock bas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {lowStock.isLoading &&
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-4 w-8 shrink-0" />
                </div>
              ))}
            {lowStock.data?.length === 0 && <p className="text-sm text-muted-foreground">Aucune alerte 🎉</p>}
            {lowStock.data?.slice(0, 6).map((item) => (
              <div key={item.variantId} className="flex items-center justify-between text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{item.productName}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.size} / {item.color} — {item.sku}
                  </p>
                </div>
                <span className="shrink-0 font-semibold text-status-critical">{item.quantity}</span>
              </div>
            ))}
            {(lowStock.data?.length ?? 0) > 0 && (
              <Button asChild variant="link" size="sm" className="h-auto px-0">
                <Link to="/inventory">Voir tout le stock →</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Commandes par statut" description="Répartition du pipeline de commandes">
          {ordersByStatus.isLoading ? (
            <ChartSkeleton height={260} />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={(ordersByStatus.data ?? []).map((d) => ({ ...d, label: ORDER_STATUS_LABEL[d.status] ?? d.status }))}
                layout="vertical"
                margin={{ left: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="label" width={100} tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="count" name="Commandes" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Valeur du stock par catégorie" description="Coût de revient total par catégorie">
          {stockByCategory.isLoading ? (
            <ChartSkeleton height={260} />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={stockByCategory.data ?? []} margin={{ left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="categoryName" tick={<HorizontalTruncatedTick />} tickLine={false} axisLine={{ stroke: 'hsl(var(--border))' }} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} width={40} />
                <Tooltip content={<ChartTooltip formatter={(v) => formatCurrency(v)} />} />
                <Bar dataKey="totalValue" name="Valeur" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
