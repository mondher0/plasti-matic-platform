import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AddCartItemInput, CartResponse } from '@plastimatic/shared';
import { api } from '@/lib/api-client';

export const cartApi = {
  get: () => api.get<CartResponse>('/cart'),
  addItem: (input: AddCartItemInput) => api.post<CartResponse>('/cart/items', input),
  updateItem: (itemId: string, quantity: number) => api.patch<CartResponse>(`/cart/items/${itemId}`, { quantity }),
  removeItem: (itemId: string) => api.delete<CartResponse>(`/cart/items/${itemId}`),
  merge: () => api.post<CartResponse>('/cart/merge'),
};

const CART_KEY = ['cart'] as const;

export function useCart() {
  return useQuery({ queryKey: CART_KEY, queryFn: cartApi.get });
}

export function useAddCartItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cartApi.addItem,
    onSuccess: (data) => queryClient.setQueryData(CART_KEY, data),
  });
}

export function useUpdateCartItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) => cartApi.updateItem(itemId, quantity),
    onSuccess: (data) => queryClient.setQueryData(CART_KEY, data),
  });
}

export function useRemoveCartItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cartApi.removeItem,
    onSuccess: (data) => queryClient.setQueryData(CART_KEY, data),
  });
}
