import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateUserInput, CreateUserResponse, PaginatedResponse, User, UserQuery } from '@plastimatic/shared';
import { api } from '@/lib/api-client';

export const usersApi = {
  create: (input: CreateUserInput) => api.post<CreateUserResponse>('/users', input),
  list: (query: UserQuery) => api.get<PaginatedResponse<User>>('/users', query),
  block: (id: string) => api.post<User>(`/users/${id}/block`),
  unblock: (id: string) => api.post<User>(`/users/${id}/unblock`),
  // Hard delete — the row is actually removed server-side (see
  // users.service.ts's remove()), so there's no updated User to hand back.
  remove: (id: string) => api.post<void>(`/users/${id}/delete`),
};

export function useUsers(query: UserQuery) {
  return useQuery({ queryKey: ['users', query], queryFn: () => usersApi.list(query) });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: usersApi.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });
}

function useUserMutation(fn: (id: string) => Promise<User>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useBlockUser() {
  return useUserMutation(usersApi.block);
}
export function useUnblockUser() {
  return useUserMutation(usersApi.unblock);
}
export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: usersApi.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });
}
