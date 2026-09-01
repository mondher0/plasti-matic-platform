import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CheckoutInput, CheckoutSessionResponse, Order } from '@plastimatic/shared';
import { api } from '@/lib/api-client';

export const ordersApi = {
  checkout: (input: CheckoutInput) => api.post<CheckoutSessionResponse>('/orders/checkout', input),
  listMine: () => api.get<Order[]>('/orders/mine'),
  findOne: (id: string) => api.get<Order>(`/orders/${id}`),
};

export function useMyOrders() {
  return useQuery({ queryKey: ['orders', 'mine'], queryFn: ordersApi.listMine });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: ['orders', id],
    queryFn: () => ordersApi.findOne(id),
    enabled: !!id,
    // Payment is confirmed asynchronously by a Stripe webhook — there's a
    // real (if usually sub-second) race between Stripe's redirect back to
    // us and that webhook landing, so keep polling while the order is still
    // PENDING rather than showing a stale "processing" state forever.
    refetchInterval: (query) => (query.state.data?.paymentStatus === 'PENDING' ? 2000 : false),
  });
}

export function useCheckout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ordersApi.checkout,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}
