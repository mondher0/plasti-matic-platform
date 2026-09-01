import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreateStockMovementInput,
  LowStockItem,
  MovementQuery,
  PaginatedResponse,
  StockMovement,
  StockVariant,
  StockVariantQuery,
} from '@plastimatic/shared';
import { api } from '@/lib/api-client';

export const inventoryApi = {
  lowStock: () => api.get<LowStockItem[]>('/inventory/low-stock'),
  movements: (query: MovementQuery) => api.get<PaginatedResponse<StockMovement>>('/inventory/movements', query),
  recordMovement: (input: CreateStockMovementInput) => api.post<StockMovement>('/inventory/movements', input),
  variants: (query: StockVariantQuery) => api.get<PaginatedResponse<StockVariant>>('/inventory/variants', query),
};

const INFINITE_PAGE_SIZE = 30;

export function useLowStock() {
  return useQuery({ queryKey: ['inventory', 'low-stock'], queryFn: inventoryApi.lowStock });
}

/** Single page of a variant's movement history — used by the detail modal,
 *  which shows one variant at a time and doesn't need infinite scroll. */
export function useMovements(variantId?: string) {
  return useQuery({
    queryKey: ['inventory', 'movements', variantId],
    queryFn: () => inventoryApi.movements({ variantId, page: 1, pageSize: 50 }),
    enabled: !!variantId,
  });
}

type MovementFilters = Pick<MovementQuery, 'type' | 'search'>;

/** Infinite-scroll feed for the Stock page's "Derniers mouvements" panel.
 *  Filters are real query params (see inventory.service.ts's listMovements)
 *  — a new filter value means a new queryKey, so react-query naturally
 *  starts the infinite list over from page 1 against the filtered result
 *  set, rather than re-filtering whatever pages happened to already be
 *  loaded client-side. */
export function useInfiniteMovements(filters: MovementFilters = {}) {
  return useInfiniteQuery({
    queryKey: ['inventory', 'movements', 'infinite', filters],
    queryFn: ({ pageParam }) => inventoryApi.movements({ ...filters, page: pageParam, pageSize: INFINITE_PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined),
  });
}

type StockVariantFilters = Pick<StockVariantQuery, 'search' | 'categoryId' | 'status'>;

/** Infinite-scroll feed for the Stock page's "Niveaux de stock" panel —
 *  same real-query-param filtering as above (see listVariants). */
export function useInfiniteStockVariants(filters: StockVariantFilters = {}) {
  return useInfiniteQuery({
    queryKey: ['inventory', 'variants', 'infinite', filters],
    queryFn: ({ pageParam }) => inventoryApi.variants({ ...filters, page: pageParam, pageSize: INFINITE_PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined),
    // Same reasoning as Catalogue's polling (catalog-api.ts) — a purchase in
    // the shop changes this data from entirely outside this app/session.
    refetchInterval: 15_000,
  });
}

export function useRecordMovement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: inventoryApi.recordMovement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['catalog'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
}
