import { formatCurrency, formatDate } from '@plastimatic/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { OrderStatusBadge } from '@/components/status-badge';
import { useMyOrders } from '../api/orders-api';

// Mirrors the real order card's layout (order number + date on the left,
// price + status badge on the right) so the loading state doesn't jump
// around once the real rows arrive.
function OrderCardSkeleton() {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-5 w-24 rounded-md" />
        </div>
      </CardContent>
    </Card>
  );
}

export function OrderHistoryPage() {
  const { data: orders, isLoading } = useMyOrders();

  return (
    <div className="container max-w-2xl py-8">
      <h1 className="mb-6 text-2xl font-semibold">Mes commandes</h1>
      {!isLoading && orders?.length === 0 && (
        <p className="text-muted-foreground">Vous n'avez pas encore passé de commande.</p>
      )}
      <div className="space-y-3">
        {isLoading && Array.from({ length: 4 }).map((_, i) => <OrderCardSkeleton key={i} />)}
        {orders?.map((order) => (
          <Card key={order.id}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium">{order.orderNumber}</p>
                <p className="text-sm text-muted-foreground">{formatDate(order.createdAt)}</p>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <p className="font-semibold">{formatCurrency(order.total)}</p>
                <OrderStatusBadge status={order.status} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
