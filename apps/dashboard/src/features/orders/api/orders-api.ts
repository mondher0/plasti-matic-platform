import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Order, OrderQuery, OrderStatus, PaginatedResponse } from '@plastimatic/shared';
import { api } from '@/lib/api-client';

export const ordersApi = {
  listAll: (query: OrderQuery) => api.get<PaginatedResponse<Order>>('/orders', query),
  findOne: (id: string) => api.get<Order>(`/orders/${id}`),
  updateStatus: (id: string, status: OrderStatus) => api.patch<Order>(`/orders/${id}/status`, { status }),
};

export function useOrders(query: OrderQuery) {
  return useQuery({ queryKey: ['orders', 'all', query], queryFn: () => ordersApi.listAll(query) });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) => ordersApi.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
}
