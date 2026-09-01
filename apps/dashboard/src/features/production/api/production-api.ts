import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreateProductionBatchInput,
  PaginatedResponse,
  ProductionBatch,
  ProductionBatchQuery,
  UpdateProductionBatchInput,
} from '@plastimatic/shared';
import { api } from '@/lib/api-client';

export const productionApi = {
  list: (query: ProductionBatchQuery) => api.get<PaginatedResponse<ProductionBatch>>('/production/batches', query),
  create: (input: CreateProductionBatchInput) => api.post<ProductionBatch>('/production/batches', input),
  update: (id: string, input: UpdateProductionBatchInput) =>
    api.patch<ProductionBatch>(`/production/batches/${id}`, input),
};

export function useProductionBatches(query: ProductionBatchQuery) {
  return useQuery({ queryKey: ['production', 'batches', query], queryFn: () => productionApi.list(query) });
}

export function useCreateProductionBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: productionApi.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['production'] }),
  });
}

export function useUpdateProductionBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateProductionBatchInput }) => productionApi.update(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
}
