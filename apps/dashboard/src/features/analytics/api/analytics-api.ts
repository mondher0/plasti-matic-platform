import { useQuery } from '@tanstack/react-query';
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
import { api } from '@/lib/api-client';

function rangeQuery(range?: DateRangeQuery) {
  return {
    from: range?.from ? range.from.toISOString() : undefined,
    to: range?.to ? range.to.toISOString() : undefined,
  };
}

export const analyticsApi = {
  overview: (range?: DateRangeQuery) => api.get<OverviewKpis>('/analytics/overview', rangeQuery(range)),
  ordersByStatus: () => api.get<OrderStatusBreakdown[]>('/analytics/orders-by-status'),
  stockByCategory: () => api.get<StockByCategory[]>('/analytics/stock-by-category'),
  revenueTrend: (range?: DateRangeQuery) => api.get<RevenueTrendPoint[]>('/analytics/revenue-trend', rangeQuery(range)),
  stockTurnover: (range?: DateRangeQuery) => api.get<StockTurnover>('/analytics/stock-turnover', rangeQuery(range)),
  abcAnalysis: () => api.get<AbcAnalysisItem[]>('/analytics/abc-analysis'),
  productionEfficiency: () => api.get<ProductionEfficiencyPoint[]>('/analytics/production-efficiency'),
  stockoutRisk: () => api.get<StockoutRiskItem[]>('/analytics/stockout-risk'),
  salesTrend: (range?: DateRangeQuery) => api.get<SalesTrendPoint[]>('/analytics/sales-trend', rangeQuery(range)),
  topProducts: () => api.get<TopProduct[]>('/analytics/top-products'),
  bottomProducts: () => api.get<TopProduct[]>('/analytics/bottom-products'),
  fulfillmentTime: () => api.get<FulfillmentTime>('/analytics/fulfillment-time'),
};

const KEYS = {
  overview: (r?: DateRangeQuery) => ['analytics', 'overview', r] as const,
  ordersByStatus: ['analytics', 'orders-by-status'] as const,
  stockByCategory: ['analytics', 'stock-by-category'] as const,
  revenueTrend: (r?: DateRangeQuery) => ['analytics', 'revenue-trend', r] as const,
  stockTurnover: (r?: DateRangeQuery) => ['analytics', 'stock-turnover', r] as const,
  abcAnalysis: ['analytics', 'abc-analysis'] as const,
  productionEfficiency: ['analytics', 'production-efficiency'] as const,
  stockoutRisk: ['analytics', 'stockout-risk'] as const,
  salesTrend: (r?: DateRangeQuery) => ['analytics', 'sales-trend', r] as const,
  topProducts: ['analytics', 'top-products'] as const,
  bottomProducts: ['analytics', 'bottom-products'] as const,
  fulfillmentTime: ['analytics', 'fulfillment-time'] as const,
};

export function useOverviewKpis(range?: DateRangeQuery) {
  return useQuery({ queryKey: KEYS.overview(range), queryFn: () => analyticsApi.overview(range) });
}
export function useOrdersByStatus() {
  return useQuery({ queryKey: KEYS.ordersByStatus, queryFn: analyticsApi.ordersByStatus });
}
export function useStockByCategory() {
  return useQuery({ queryKey: KEYS.stockByCategory, queryFn: analyticsApi.stockByCategory });
}
export function useRevenueTrend(range?: DateRangeQuery) {
  return useQuery({ queryKey: KEYS.revenueTrend(range), queryFn: () => analyticsApi.revenueTrend(range) });
}
export function useStockTurnover(range?: DateRangeQuery) {
  return useQuery({ queryKey: KEYS.stockTurnover(range), queryFn: () => analyticsApi.stockTurnover(range) });
}
export function useAbcAnalysis() {
  return useQuery({ queryKey: KEYS.abcAnalysis, queryFn: analyticsApi.abcAnalysis });
}
export function useProductionEfficiency() {
  return useQuery({ queryKey: KEYS.productionEfficiency, queryFn: analyticsApi.productionEfficiency });
}
export function useStockoutRisk() {
  return useQuery({ queryKey: KEYS.stockoutRisk, queryFn: analyticsApi.stockoutRisk });
}
export function useSalesTrend(range?: DateRangeQuery) {
  return useQuery({ queryKey: KEYS.salesTrend(range), queryFn: () => analyticsApi.salesTrend(range) });
}
export function useTopProducts() {
  return useQuery({ queryKey: KEYS.topProducts, queryFn: analyticsApi.topProducts });
}
export function useBottomProducts() {
  return useQuery({ queryKey: KEYS.bottomProducts, queryFn: analyticsApi.bottomProducts });
}
export function useFulfillmentTime() {
  return useQuery({ queryKey: KEYS.fulfillmentTime, queryFn: analyticsApi.fulfillmentTime });
}
