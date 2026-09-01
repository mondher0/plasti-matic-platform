import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  Category,
  CreateCategoryInput,
  CreateProductInput,
  CreateProductVariantInput,
  PaginatedResponse,
  Product,
  ProductQuery,
  UpdateProductInput,
  UpdateProductVariantInput,
} from '@plastimatic/shared';
import { api } from '@/lib/api-client';

export const catalogApi = {
  listCategories: () => api.get<Category[]>('/categories'),
  createCategory: (input: CreateCategoryInput) => api.post<Category>('/categories', input),
  listProducts: (query: ProductQuery = { page: 1, pageSize: 10 }) =>
    api.get<PaginatedResponse<Product>>('/products', query),
  getProduct: (id: string) => api.get<Product>(`/products/${id}`),
  createProduct: (input: CreateProductInput) => api.post<Product>('/products', input),
  updateProduct: (id: string, input: UpdateProductInput) => api.patch<Product>(`/products/${id}`, input),
  deleteProduct: (id: string) => api.delete<void>(`/products/${id}`),
  addVariant: (productId: string, input: CreateProductVariantInput) =>
    api.post<Product>(`/products/${productId}/variants`, input),
  updateVariant: (productId: string, variantId: string, input: UpdateProductVariantInput) =>
    api.patch<Product>(`/products/${productId}/variants/${variantId}`, input),
};

export function useCategories() {
  return useQuery({ queryKey: ['catalog', 'categories'], queryFn: catalogApi.listCategories });
}

export function useProducts(query: ProductQuery = { page: 1, pageSize: 10 }, options?: { poll?: boolean }) {
  return useQuery({
    queryKey: ['catalog', 'products', query],
    queryFn: () => catalogApi.listProducts(query),
    // Off by default (e.g. the variant-picker dropdowns in Production/Stock
    // dialogs don't need it) — the Catalogue page itself opts in, since its
    // stock totals can change from purchases made in the shop, a completely
    // separate app/session with no way to invalidate this cache directly.
    // refetchOnWindowFocus (see query-client.ts) covers switching back to
    // this tab; this covers someone just leaving it open and watching it.
    refetchInterval: options?.poll ? 15_000 : undefined,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: catalogApi.createCategory,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['catalog', 'categories'] }),
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: catalogApi.createProduct,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['catalog'] }),
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateProductInput }) => catalogApi.updateProduct(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['catalog'] }),
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: catalogApi.deleteProduct,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['catalog'] }),
  });
}

export function useAddVariant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, input }: { productId: string; input: CreateProductVariantInput }) =>
      catalogApi.addVariant(productId, input),
    // A variant is also read by the Stock page (its own list, and the
    // low-stock alert) under the ['inventory', ...] query key — invalidating
    // only ['catalog'] left that page showing stale data after this mutation.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalog'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}

export function useUpdateVariant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      productId,
      variantId,
      input,
    }: {
      productId: string;
      variantId: string;
      input: UpdateProductVariantInput;
    }) => catalogApi.updateVariant(productId, variantId, input),
    // Same reasoning as useAddVariant above — this is also how the Stock
    // page's "Seuil d'alerte — modifier" editor saves, so ['inventory'] must
    // be invalidated too or the Stock page (and this dialog, which reads its
    // data back from that same cache) keeps showing the pre-edit threshold.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalog'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}
