import { useQuery, keepPreviousData } from '@tanstack/react-query';
import type { Category, PaginatedResponse, Product, ProductQuery } from '@plastimatic/shared';
import { api } from '@/lib/api-client';

type ShopProductQuery = Omit<ProductQuery, 'isActive'>;

export const catalogApi = {
  listCategories: () => api.get<Category[]>('/categories'),
  // Real server-side pagination — each page is its own request, so the
  // catalog scales past any fixed product count instead of silently
  // dropping anything past a one-shot fetch's cap.
  listProducts: (query: ShopProductQuery): Promise<PaginatedResponse<Product>> =>
    api.get<PaginatedResponse<Product>>('/products', { ...query, isActive: true }),
  getBySlug: (slug: string) => api.get<Product>(`/products/slug/${slug}`),
};

export function useCategories() {
  return useQuery({ queryKey: ['categories'], queryFn: catalogApi.listCategories });
}

export function useProducts(query: ShopProductQuery) {
  return useQuery({
    queryKey: ['products', query],
    queryFn: () => catalogApi.listProducts(query),
    // Keeps the current page's products on screen (instead of flashing back
    // to the loading skeleton) while the next page is being fetched.
    placeholderData: keepPreviousData,
  });
}

export function useProductBySlug(slug: string) {
  return useQuery({ queryKey: ['products', 'slug', slug], queryFn: () => catalogApi.getBySlug(slug), enabled: !!slug });
}
