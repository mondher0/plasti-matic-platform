import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  AbcAnalysisItem,
  DateRangeQuery,
  FulfillmentTime,
  OrderStatusBreakdown,
  OverviewKpis,
  ProductionEfficiencyPoint,
  RevenueTrendPoint,
  SalesTrendPoint,
  StockByCategory,
  StockTurnover,
  StockoutRiskItem,
  TopProduct,
} from '@plastimatic/shared';
import { PrismaService } from '../prisma/prisma.service';
import { toNumber } from '../common/decimal';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const STOCKOUT_RISK_THRESHOLD_DAYS = 14;
const MOVING_AVERAGE_WINDOW_DAYS = 7;

/** Default reporting window when the caller doesn't specify one: trailing 30 days. */
function resolveRange(range: DateRangeQuery): { from: Date; to: Date } {
  const to = range.to ?? new Date();
  const from = range.from ?? new Date(to.getTime() - 30 * MS_PER_DAY);
  return { from, to };
}

/** Orders that count as "real" sales for revenue-derived KPIs. */
const REVENUE_WHERE = { paymentStatus: 'PAID' as const, status: { not: 'CANCELLED' as const } };

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------
  // Basic KPIs
  // ---------------------------------------------------------------------

  async getOverview(range: DateRangeQuery): Promise<OverviewKpis> {
    const { from, to } = resolveRange(range);

    const [
      stockValueRow,
      lowStockRow,
      unitsRow,
      orderAgg,
      totalProducts,
      totalSkus,
      productionAgg,
    ] = await Promise.all([
      this.prisma.$queryRaw<{ value: number | null }[]>`
        SELECT COALESCE(SUM(quantity * "costPrice"), 0)::float AS value FROM "ProductVariant"
      `,
      this.prisma.$queryRaw<{ count: number }[]>`
        SELECT COUNT(*)::int AS count FROM "ProductVariant" WHERE quantity <= "lowStockThreshold"
      `,
      this.prisma.productVariant.aggregate({ _sum: { quantity: true } }),
      this.prisma.order.aggregate({
        where: { ...REVENUE_WHERE, createdAt: { gte: from, lte: to } },
        _count: true,
        _sum: { total: true },
      }),
      this.prisma.product.count(),
      this.prisma.productVariant.count(),
      this.prisma.productionBatch.aggregate({
        where: { status: 'COMPLETED', endDate: { gte: from, lte: to } },
        _sum: { producedQty: true },
      }),
    ]);

    const revenueInPeriod = toNumber(orderAgg._sum.total);
    const ordersInPeriod = orderAgg._count;

    return {
      totalStockValue: stockValueRow[0]?.value ?? 0,
      totalUnitsInStock: unitsRow._sum.quantity ?? 0,
      lowStockCount: lowStockRow[0]?.count ?? 0,
      ordersInPeriod,
      revenueInPeriod,
      averageOrderValue: ordersInPeriod > 0 ? revenueInPeriod / ordersInPeriod : 0,
      totalProducts,
      totalSkus,
      productionOutputInPeriod: productionAgg._sum.producedQty ?? 0,
    };
  }

  async getOrderStatusBreakdown(): Promise<OrderStatusBreakdown[]> {
    const rows = await this.prisma.order.groupBy({ by: ['status'], _count: true });
    return rows.map((r) => ({ status: r.status, count: r._count }));
  }

  async getStockByCategory(): Promise<StockByCategory[]> {
    return this.prisma.$queryRaw<StockByCategory[]>`
      SELECT c.name AS "categoryName",
             COALESCE(SUM(v.quantity), 0)::int AS "totalUnits",
             COALESCE(SUM(v.quantity * v."costPrice"), 0)::float AS "totalValue"
      FROM "Category" c
      LEFT JOIN "Product" p ON p."categoryId" = c.id
      LEFT JOIN "ProductVariant" v ON v."productId" = p.id
      GROUP BY c.name
      ORDER BY "totalValue" DESC
    `;
  }

  /** Daily revenue + order count over the range, used for the overview chart. */
  async getRevenueTrend(range: DateRangeQuery): Promise<RevenueTrendPoint[]> {
    const { from, to } = resolveRange(range);
    const rows = await this.dailySeries(from, to);
    return rows.map((r) => ({ date: r.day, revenue: r.revenue, orders: r.orders }));
  }

  // ---------------------------------------------------------------------
  // Advanced KPIs
  // ---------------------------------------------------------------------

  async getStockTurnover(range: DateRangeQuery): Promise<StockTurnover> {
    const { from, to } = resolveRange(range);
    const periodDays = Math.max(1, (to.getTime() - from.getTime()) / MS_PER_DAY);

    const [cogsRow, startValueRow, endValueRow] = await Promise.all([
      this.prisma.$queryRaw<{ cogs: number | null }[]>`
        SELECT COALESCE(SUM(oi.quantity * v."costPrice"), 0)::float AS cogs
        FROM "OrderItem" oi
        JOIN "Order" o ON o.id = oi."orderId"
        JOIN "ProductVariant" v ON v.id = oi."variantId"
        WHERE o."paymentStatus" = 'PAID' AND o.status != 'CANCELLED'
          AND o."createdAt" BETWEEN ${from} AND ${to}
      `,
      this.inventoryValueAsOf(from),
      this.inventoryValueAsOf(to),
    ]);

    const cogs = cogsRow[0]?.cogs ?? 0;
    const averageInventoryValue = (startValueRow + endValueRow) / 2;
    const turnoverRatio = averageInventoryValue > 0 ? cogs / averageInventoryValue : 0;
    const daysInventoryOutstanding = turnoverRatio > 0 ? periodDays / turnoverRatio : 0;

    return { cogs, averageInventoryValue, turnoverRatio, daysInventoryOutstanding };
  }

  /**
   * Reconstructs total inventory value at a point in time from the
   * StockMovement ledger (cumulative signed quantity per variant, up to
   * `asOf`, times the variant's *current* cost price — historical cost
   * changes aren't tracked, which is an accepted simplification for this
   * project's scope).
   */
  private async inventoryValueAsOf(asOf: Date): Promise<number> {
    const rows = await this.prisma.$queryRaw<{ value: number | null }[]>`
      SELECT COALESCE(SUM(t.qty_as_of * v."costPrice"), 0)::float AS value
      FROM (
        SELECT sm."variantId" AS "variantId",
               SUM(CASE WHEN sm.type = 'OUT' THEN -sm.quantity ELSE sm.quantity END) AS qty_as_of
        FROM "StockMovement" sm
        WHERE sm."createdAt" <= ${asOf}
        GROUP BY sm."variantId"
      ) t
      JOIN "ProductVariant" v ON v.id = t."variantId"
    `;
    return rows[0]?.value ?? 0;
  }

  async getAbcAnalysis(): Promise<AbcAnalysisItem[]> {
    const rows = await this.prisma.$queryRaw<
      { productId: string; productName: string; revenue: number; cumulativeSharePct: number | null }[]
    >`
      WITH product_revenue AS (
        SELECT p.id AS "productId", p.name AS "productName", SUM(oi."lineTotal")::float AS revenue
        FROM "OrderItem" oi
        JOIN "Order" o ON o.id = oi."orderId"
        JOIN "ProductVariant" v ON v.id = oi."variantId"
        JOIN "Product" p ON p.id = v."productId"
        WHERE o."paymentStatus" = 'PAID' AND o.status != 'CANCELLED'
        GROUP BY p.id, p.name
      )
      SELECT "productId", "productName", revenue,
             (SUM(revenue) OVER (ORDER BY revenue DESC) /
               NULLIF(SUM(revenue) OVER (), 0) * 100) AS "cumulativeSharePct"
      FROM product_revenue
      ORDER BY revenue DESC
    `;

    return rows.map((r) => {
      const share = r.cumulativeSharePct ?? 0;
      const abcClass: AbcAnalysisItem['abcClass'] = share <= 80 ? 'A' : share <= 95 ? 'B' : 'C';
      return { ...r, cumulativeSharePct: share, abcClass };
    });
  }

  async getProductionEfficiency(): Promise<ProductionEfficiencyPoint[]> {
    const batches = await this.prisma.productionBatch.findMany({
      where: { status: 'COMPLETED' },
      orderBy: { endDate: 'desc' },
      take: 50,
    });

    return batches.map((b) => ({
      batchId: b.id,
      batchNumber: b.batchNumber,
      plannedQty: b.plannedQty,
      producedQty: b.producedQty,
      defectQty: b.defectQty,
      yieldRate: b.plannedQty > 0 ? b.producedQty / b.plannedQty : 0,
      defectRate: b.producedQty > 0 ? b.defectQty / b.producedQty : 0,
    }));
  }

  /**
   * Heuristic, not a forecast: days-remaining = current stock / trailing
   * 30-day average daily sales. Variants with no recent sales get `null`
   * (velocity unknown, risk can't be estimated) rather than a misleading number.
   */
  async getStockoutRisk(): Promise<StockoutRiskItem[]> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * MS_PER_DAY);

    const [velocityRows, variants] = await Promise.all([
      this.prisma.$queryRaw<{ variantId: string; avgDaily: number }[]>`
        SELECT oi."variantId" AS "variantId", (SUM(oi.quantity)::float / 30) AS "avgDaily"
        FROM "OrderItem" oi
        JOIN "Order" o ON o.id = oi."orderId"
        WHERE o."createdAt" >= ${thirtyDaysAgo}
          AND o."paymentStatus" = 'PAID' AND o.status != 'CANCELLED'
        GROUP BY oi."variantId"
      `,
      this.prisma.productVariant.findMany({ include: { product: true } }),
    ]);

    const velocityByVariant = new Map(velocityRows.map((r) => [r.variantId, r.avgDaily]));

    return variants
      .map((v) => {
        const avgDailyVelocity = velocityByVariant.get(v.id) ?? 0;
        const daysRemaining = avgDailyVelocity > 0 ? v.quantity / avgDailyVelocity : null;
        return {
          variantId: v.id,
          sku: v.sku,
          productName: v.product.name,
          quantity: v.quantity,
          avgDailyVelocity,
          daysRemaining,
          atRisk: daysRemaining !== null && daysRemaining < STOCKOUT_RISK_THRESHOLD_DAYS,
        };
      })
      .filter((r) => r.atRisk)
      .sort((a, b) => (a.daysRemaining ?? Infinity) - (b.daysRemaining ?? Infinity))
      .slice(0, 20);
  }

  /** N-day moving average trend line — explicitly not a statistical forecast. */
  async getSalesTrend(range: DateRangeQuery): Promise<SalesTrendPoint[]> {
    const { from, to } = resolveRange(range);
    const rows = await this.dailySeries(from, to);
    return rows.map((r) => ({ date: r.day, revenue: r.revenue, movingAverage: r.movingAverage }));
  }

  async getTopProducts(limit = 10): Promise<TopProduct[]> {
    return this.productRanking('DESC', limit);
  }

  async getBottomProducts(limit = 10): Promise<TopProduct[]> {
    return this.productRanking('ASC', limit);
  }

  private productRanking(direction: 'ASC' | 'DESC', limit: number): Promise<TopProduct[]> {
    // direction is a fixed internal literal (never user input), safe to splice into SQL text.
    return direction === 'DESC'
      ? this.prisma.$queryRaw<TopProduct[]>`
          SELECT p.id AS "productId", p.name AS "productName",
                 COALESCE(SUM(oi.quantity), 0)::int AS "unitsSold",
                 COALESCE(SUM(oi."lineTotal"), 0)::float AS revenue
          FROM "Product" p
          JOIN "ProductVariant" v ON v."productId" = p.id
          LEFT JOIN "OrderItem" oi ON oi."variantId" = v.id
          LEFT JOIN "Order" o ON o.id = oi."orderId" AND o."paymentStatus" = 'PAID' AND o.status != 'CANCELLED'
          GROUP BY p.id, p.name
          ORDER BY revenue DESC
          LIMIT ${limit}
        `
      : this.prisma.$queryRaw<TopProduct[]>`
          SELECT p.id AS "productId", p.name AS "productName",
                 COALESCE(SUM(oi.quantity), 0)::int AS "unitsSold",
                 COALESCE(SUM(oi."lineTotal"), 0)::float AS revenue
          FROM "Product" p
          JOIN "ProductVariant" v ON v."productId" = p.id
          LEFT JOIN "OrderItem" oi ON oi."variantId" = v.id
          LEFT JOIN "Order" o ON o.id = oi."orderId" AND o."paymentStatus" = 'PAID' AND o.status != 'CANCELLED'
          GROUP BY p.id, p.name
          ORDER BY revenue ASC
          LIMIT ${limit}
        `;
  }

  async getFulfillmentTime(): Promise<FulfillmentTime> {
    const rows = await this.prisma.$queryRaw<{ avgHours: number | null; sampleSize: number }[]>`
      SELECT AVG(EXTRACT(EPOCH FROM ("deliveredAt" - "createdAt")) / 3600)::float AS "avgHours",
             COUNT(*)::int AS "sampleSize"
      FROM "Order"
      WHERE "deliveredAt" IS NOT NULL
    `;
    return { averageHours: rows[0]?.avgHours ?? null, sampleSize: rows[0]?.sampleSize ?? 0 };
  }

  /**
   * Shared building block for the overview trend and the sales-trend KPI:
   * one row per calendar day in [from, to] (gaps filled with zero via
   * generate_series so charts don't show misleading breaks), plus a
   * MOVING_AVERAGE_WINDOW_DAYS-day trailing moving average of revenue.
   */
  private async dailySeries(
    from: Date,
    to: Date,
  ): Promise<{ day: string; revenue: number; orders: number; movingAverage: number }[]> {
    const rows = await this.prisma.$queryRaw<
      { day: Date; revenue: number; orders: number; movingAverage: number }[]
    >`
      WITH days AS (
        SELECT generate_series(${from}::date, ${to}::date, interval '1 day')::date AS day
      ),
      daily AS (
        SELECT date_trunc('day', o."createdAt")::date AS day,
               SUM(o.total)::float AS revenue,
               COUNT(*)::int AS orders
        FROM "Order" o
        WHERE o."paymentStatus" = 'PAID' AND o.status != 'CANCELLED'
          AND o."createdAt" BETWEEN ${from} AND ${to}
        GROUP BY day
      )
      SELECT d.day,
             COALESCE(daily.revenue, 0) AS revenue,
             COALESCE(daily.orders, 0) AS orders,
             AVG(COALESCE(daily.revenue, 0)) OVER (
               ORDER BY d.day ROWS BETWEEN ${Prisma.raw(String(MOVING_AVERAGE_WINDOW_DAYS - 1))} PRECEDING AND CURRENT ROW
             )::float AS "movingAverage"
      FROM days d
      LEFT JOIN daily ON daily.day = d.day
      ORDER BY d.day
    `;

    return rows.map((r) => ({
      day: r.day.toISOString().slice(0, 10),
      revenue: r.revenue,
      orders: r.orders,
      movingAverage: r.movingAverage,
    }));
  }
}
