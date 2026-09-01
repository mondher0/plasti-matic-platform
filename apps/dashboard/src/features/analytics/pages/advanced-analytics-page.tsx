import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Clock, PackageSearch, Repeat, Timer } from 'lucide-react';
import { formatCurrency, formatPercent } from '@plastimatic/shared';
import { PageHeader } from '@/components/page-header';
import { StickyHeader } from '@/components/sticky-header';
import { KpiCard } from '@/components/kpi-card';
import { StatusBadge } from '@/components/status-badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChartSkeleton } from '@/components/chart-skeleton';
import { TableSkeletonRows } from '@/components/table-skeleton';
import {
  useAbcAnalysis,
  useBottomProducts,
  useFulfillmentTime,
  useProductionEfficiency,
  useSalesTrend,
  useStockTurnover,
  useStockoutRisk,
  useTopProducts,
} from '../api/analytics-api';
import { ChartCard } from '../components/chart-card';
import { ChartTooltip } from '../components/chart-tooltip';
import { CategoryTruncatedTick, RotatedTruncatedTick } from '../components/chart-ticks';
import { DateRangeFilter, defaultRange } from '../components/date-range-filter';

export function AdvancedAnalyticsPage() {
  const [days, setDays] = useState(30);
  const [range, setRange] = useState(defaultRange(30));

  return (
    <div>
      <StickyHeader>
        <PageHeader
          title="Analyses avancées"
          description="Indicateurs de rotation, ABC, efficacité de production et risque de rupture"
          actions={<DateRangeFilter activeDays={days} onChange={(r, d) => { setRange(r); setDays(d); }} />}
        />
      </StickyHeader>

      <Tabs defaultValue="sales">
        <TabsList>
          <TabsTrigger value="sales">Ventes</TabsTrigger>
          <TabsTrigger value="stock">Stock</TabsTrigger>
          <TabsTrigger value="production">Production</TabsTrigger>
          <TabsTrigger value="products">Produits</TabsTrigger>
        </TabsList>

        <TabsContent value="sales">
          <SalesTrendTab range={range} />
        </TabsContent>
        <TabsContent value="stock">
          <StockTab range={range} />
        </TabsContent>
        <TabsContent value="production">
          <ProductionTab />
        </TabsContent>
        <TabsContent value="products">
          <ProductsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SalesTrendTab({ range }: { range: { from: Date; to: Date } }) {
  const salesTrend = useSalesTrend(range);
  return (
    <ChartCard
      title="Tendance des ventes"
      description="Revenu quotidien et moyenne mobile sur 7 jours — une ligne de tendance, pas une prévision statistique"
    >
      {salesTrend.isLoading ? (
        <ChartSkeleton height={320} />
      ) : (
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={salesTrend.data ?? []}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={{ stroke: 'hsl(var(--border))' }} />
            <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} width={48} />
            <Tooltip content={<ChartTooltip formatter={(v) => formatCurrency(v)} />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="revenue" name="Revenu du jour" stroke="hsl(var(--chart-2))" strokeWidth={1.5} dot={false} />
            <Line type="monotone" dataKey="movingAverage" name="Moyenne mobile (7j)" stroke="hsl(var(--chart-1))" strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

function StockTab({ range }: { range: { from: Date; to: Date } }) {
  const turnover = useStockTurnover(range);
  const stockoutRisk = useStockoutRisk();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Coût des ventes (COGS)" value={formatCurrency(turnover.data?.cogs ?? 0)} icon={Repeat} isLoading={turnover.isLoading} />
        <KpiCard
          label="Valeur moyenne du stock"
          value={formatCurrency(turnover.data?.averageInventoryValue ?? 0)}
          icon={PackageSearch}
          isLoading={turnover.isLoading}
        />
        <KpiCard
          label="Taux de rotation"
          value={(turnover.data?.turnoverRatio ?? 0).toFixed(2) + '×'}
          icon={Repeat}
          isLoading={turnover.isLoading}
          hint="COGS / stock moyen"
        />
        <KpiCard
          label="Jours de couverture (DIO)"
          value={`${(turnover.data?.daysInventoryOutstanding ?? 0).toFixed(0)} j`}
          icon={Timer}
          isLoading={turnover.isLoading}
        />
      </div>

      <ChartCard
        title="SKUs à risque de rupture"
        description="Heuristique : stock actuel ÷ vélocité moyenne des 30 derniers jours — pas une prévision"
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produit</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead className="text-right">Stock actuel</TableHead>
              <TableHead className="text-right">Vélocité / jour</TableHead>
              <TableHead className="text-right">Jours restants</TableHead>
              <TableHead>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stockoutRisk.isLoading && <TableSkeletonRows columns={6} />}
            {stockoutRisk.data?.map((item) => (
              <TableRow key={item.variantId}>
                <TableCell className="font-medium">{item.productName}</TableCell>
                <TableCell className="text-muted-foreground">{item.sku}</TableCell>
                <TableCell className="text-right">{item.quantity}</TableCell>
                <TableCell className="text-right">{item.avgDailyVelocity.toFixed(1)}</TableCell>
                <TableCell className="text-right">{item.daysRemaining?.toFixed(0) ?? '—'}</TableCell>
                <TableCell>
                  <StatusBadge
                    label={item.daysRemaining !== null && item.daysRemaining < 7 ? 'Critique' : 'À surveiller'}
                    tone={item.daysRemaining !== null && item.daysRemaining < 7 ? 'critical' : 'warning'}
                  />
                </TableCell>
              </TableRow>
            ))}
            {stockoutRisk.data?.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                  Aucun SKU à risque actuellement 🎉
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </ChartCard>
    </div>
  );
}

function ProductionTab() {
  const efficiency = useProductionEfficiency();
  const chartData = useMemo(
    () =>
      (efficiency.data ?? [])
        .slice(0, 15)
        .reverse()
        .map((b) => ({
          batch: b.batchNumber,
          Rendement: Math.round(b.yieldRate * 1000) / 10,
          Défauts: Math.round(b.defectRate * 1000) / 10,
        })),
    [efficiency.data],
  );

  return (
    <div className="space-y-4">
      <ChartCard title="Rendement & taux de défauts par lot" description="Lots de production terminés (15 plus récents)">
        {efficiency.isLoading ? (
          <ChartSkeleton height={300} />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="batch" tick={<RotatedTruncatedTick />} tickLine={false} axisLine={{ stroke: 'hsl(var(--border))' }} interval={0} height={70} />
              <YAxis unit="%" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} width={44} />
              <Tooltip content={<ChartTooltip formatter={(v) => `${v.toFixed(1)}%`} />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Rendement" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} maxBarSize={20} />
              <Bar dataKey="Défauts" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} maxBarSize={20} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard title="Détail des lots" description="Tous les lots de production terminés">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Lot</TableHead>
              <TableHead className="text-right">Planifié</TableHead>
              <TableHead className="text-right">Produit</TableHead>
              <TableHead className="text-right">Défauts</TableHead>
              <TableHead className="text-right">Rendement</TableHead>
              <TableHead className="text-right">Taux de défauts</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {efficiency.isLoading && <TableSkeletonRows columns={6} />}
            {efficiency.data?.map((b) => (
              <TableRow key={b.batchId}>
                <TableCell className="font-medium">{b.batchNumber}</TableCell>
                <TableCell className="text-right">{b.plannedQty}</TableCell>
                <TableCell className="text-right">{b.producedQty}</TableCell>
                <TableCell className="text-right">{b.defectQty}</TableCell>
                <TableCell className="text-right">{formatPercent(b.yieldRate)}</TableCell>
                <TableCell className="text-right">{formatPercent(b.defectRate)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ChartCard>
    </div>
  );
}

const ABC_TONE: Record<string, 'good' | 'warning' | 'neutral'> = { A: 'good', B: 'warning', C: 'neutral' };

function ProductsTab() {
  const topProducts = useTopProducts();
  const bottomProducts = useBottomProducts();
  const abc = useAbcAnalysis();
  const fulfillment = useFulfillmentTime();

  const abcSummary = useMemo(() => {
    const totals: Record<string, number> = { A: 0, B: 0, C: 0 };
    for (const item of abc.data ?? []) totals[item.abcClass] += item.revenue;
    return [
      { name: 'Classe A', value: totals.A },
      { name: 'Classe B', value: totals.B },
      { name: 'Classe C', value: totals.C },
    ];
  }, [abc.data]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Meilleures ventes" description="Top 10 produits par revenu">
          {topProducts.isLoading ? (
            <ChartSkeleton height={280} />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={topProducts.data ?? []} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="productName" width={140} tick={<CategoryTruncatedTick />} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip formatter={(v) => formatCurrency(v)} />} />
                <Bar dataKey="revenue" name="Revenu" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Ventes les plus faibles" description="10 produits les moins performants">
          {bottomProducts.isLoading ? (
            <ChartSkeleton height={280} />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={bottomProducts.data ?? []} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="productName" width={140} tick={<CategoryTruncatedTick />} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip formatter={(v) => formatCurrency(v)} />} />
                <Bar dataKey="revenue" name="Revenu" fill="hsl(var(--chart-5))" radius={[0, 4, 4, 0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartCard title="Répartition ABC" description="Part du revenu par classe" className="lg:col-span-1">
          {abc.isLoading ? (
            <ChartSkeleton height={220} />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={abcSummary}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={{ stroke: 'hsl(var(--border))' }} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} width={40} />
                <Tooltip content={<ChartTooltip formatter={(v) => formatCurrency(v)} />} />
                <Bar dataKey="value" name="Revenu" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Classement ABC" description="Produits triés par contribution au revenu" className="lg:col-span-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produit</TableHead>
                <TableHead className="text-right">Revenu</TableHead>
                <TableHead className="text-right">Cumul %</TableHead>
                <TableHead>Classe</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {abc.isLoading && <TableSkeletonRows columns={4} />}
              {abc.data?.slice(0, 12).map((item) => (
                <TableRow key={item.productId}>
                  <TableCell className="font-medium">{item.productName}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.revenue)}</TableCell>
                  <TableCell className="text-right">{item.cumulativeSharePct.toFixed(1)}%</TableCell>
                  <TableCell>
                    <StatusBadge label={`Classe ${item.abcClass}`} tone={ABC_TONE[item.abcClass]} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ChartCard>
      </div>

      <KpiCard
        label="Délai moyen de livraison"
        value={fulfillment.data?.averageHours ? `${(fulfillment.data.averageHours / 24).toFixed(1)} j` : '—'}
        icon={Clock}
        isLoading={fulfillment.isLoading}
        hint={`Basé sur ${fulfillment.data?.sampleSize ?? 0} commande(s) livrée(s)`}
      />
    </div>
  );
}
