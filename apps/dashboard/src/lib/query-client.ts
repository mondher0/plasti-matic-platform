import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      // Stock/orders/users can change from entirely outside this app — a
      // customer buying something in the shop (a separate session/origin),
      // or another staff member acting in their own dashboard tab. With this
      // off, a page left open just keeps showing whatever it last fetched
      // until something happens to invalidate it locally, which nothing
      // ever does for changes that originated elsewhere. Re-enabling it
      // (React Query's own default) means switching back into this tab
      // re-validates anything already older than `staleTime` above, so the
      // numbers catch up without needing websockets/polling.
      refetchOnWindowFocus: true,
    },
  },
});
