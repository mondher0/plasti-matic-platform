import { z } from 'zod';

/** ---- Basic KPIs ---- */
export const OverviewKpisSchema = z.object({
  totalStockValue: z.number(),
  totalUnitsInStock: z.number(),
  lowStockCount: z.number(),
  ordersInPeriod: z.number(),
  revenueInPeriod: z.number(),
  averageOrderValue: z.number(),
  totalProducts: z.number(),
  totalSkus: z.number(),
  productionOutputInPeriod: z.number(),
});
export type OverviewKpis = z.infer<typeof OverviewKpisSchema>;

export const RevenueTrendPointSchema = z.object({
  date: z.string(), // ISO date (day granularity)
  revenue: z.number(),
  orders: z.number(),
});
export type RevenueTrendPoint = z.infer<typeof RevenueTrendPointSchema>;

export const OrderStatusBreakdownSchema = z.object({
  status: z.string(),
  count: z.number(),
});
export type OrderStatusBreakdown = z.infer<typeof OrderStatusBreakdownSchema>;

export const StockByCategorySchema = z.object({
  categoryName: z.string(),
  totalUnits: z.number(),
  totalValue: z.number(),
});
export type StockByCategory = z.infer<typeof StockByCategorySchema>;

/** ---- Advanced KPIs ---- */
export const StockTurnoverSchema = z.object({
  cogs: z.number(),
  averageInventoryValue: z.number(),
  turnoverRatio: z.number(),
  daysInventoryOutstanding: z.number(),
});
export type StockTurnover = z.infer<typeof StockTurnoverSchema>;

export const AbcAnalysisItemSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  revenue: z.number(),
  cumulativeSharePct: z.number(),
  abcClass: z.enum(['A', 'B', 'C']),
});
export type AbcAnalysisItem = z.infer<typeof AbcAnalysisItemSchema>;

export const ProductionEfficiencyPointSchema = z.object({
  batchId: z.string(),
  batchNumber: z.string(),
  plannedQty: z.number(),
  producedQty: z.number(),
  defectQty: z.number(),
  yieldRate: z.number(), // producedQty / plannedQty
  defectRate: z.number(), // defectQty / producedQty
});
export type ProductionEfficiencyPoint = z.infer<typeof ProductionEfficiencyPointSchema>;

export const StockoutRiskItemSchema = z.object({
  variantId: z.string(),
  sku: z.string(),
  productName: z.string(),
  quantity: z.number(),
  avgDailyVelocity: z.number(),
  daysRemaining: z.number().nullable(), // null = no recent sales velocity, can't estimate
  atRisk: z.boolean(),
});
export type StockoutRiskItem = z.infer<typeof StockoutRiskItemSchema>;

export const SalesTrendPointSchema = z.object({
  date: z.string(),
  revenue: z.number(),
  movingAverage: z.number(),
});
export type SalesTrendPoint = z.infer<typeof SalesTrendPointSchema>;

export const TopProductSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  unitsSold: z.number(),
  revenue: z.number(),
});
export type TopProduct = z.infer<typeof TopProductSchema>;

export const FulfillmentTimeSchema = z.object({
  averageHours: z.number().nullable(),
  sampleSize: z.number(),
});
export type FulfillmentTime = z.infer<typeof FulfillmentTimeSchema>;
