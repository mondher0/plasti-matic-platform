import { useState } from 'react';
import { Search } from 'lucide-react';
import { formatCurrency, formatDate } from '@plastimatic/shared';
import type { OrderStatus, PaymentStatus } from '@plastimatic/shared';
import { PageHeader } from '@/components/page-header';
import { StickyHeader } from '@/components/sticky-header';
import { PaginationFooter } from '@/components/pagination-footer';
import { TableSkeletonRows } from '@/components/table-skeleton';
import { OrderStatusBadge } from '@/components/status-badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useOrders, useUpdateOrderStatus } from '../api/orders-api';
import { OrderDetailDialog } from '../components/order-detail-dialog';

const STATUSES: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
const PAYMENT_STATUSES: PaymentStatus[] = ['PENDING', 'PAID', 'FAILED'];
const PAGE_SIZE = 10;
const ALL = 'all';

export function OrdersPage() {
  // Real query params (see orders.service.ts's listAll) — not a client-side
  // re-filter of whatever page happens to already be loaded.
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | typeof ALL>(ALL);
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<PaymentStatus | typeof ALL>(ALL);
  const [page, setPage] = useState(1);

  const orders = useOrders({
    search: search || undefined,
    status: statusFilter === ALL ? undefined : statusFilter,
    paymentStatus: paymentStatusFilter === ALL ? undefined : paymentStatusFilter,
    page,
    pageSize: PAGE_SIZE,
  });
  const updateStatus = useUpdateOrderStatus();
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  // Look the order up fresh from the query cache each render, instead of
  // snapshotting it, so the detail modal reflects a status change made
  // either from the table's inline select or from inside the modal itself.
  const selectedOrder = orders.data?.items.find((o) => o.id === selectedOrderId) ?? null;

  const updateFilter = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    setPage(1);
  };

  return (
    <div>
      <StickyHeader>
        <PageHeader title="Commandes" description="Suivi et gestion des commandes e-commerce" />
      </StickyHeader>

      <Card>
        <CardContent className="space-y-3 border-b p-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un n° de commande, un client ou un e-mail…"
                className="pl-8"
                value={search}
                onChange={(e) => updateFilter(setSearch)(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={updateFilter(setStatusFilter) as (v: string) => void}>
              <SelectTrigger className="sm:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tous statuts</SelectItem>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={paymentStatusFilter}
              onValueChange={updateFilter(setPaymentStatusFilter) as (v: string) => void}
            >
              <SelectTrigger className="sm:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tous paiements</SelectItem>
                {PAYMENT_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N° commande</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Articles</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Paiement</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.isLoading && <TableSkeletonRows columns={8} />}
              {orders.data?.items.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.orderNumber}</TableCell>
                  <TableCell>
                    {order.customer ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarImage src={order.customer.avatarUrl ?? undefined} />
                          <AvatarFallback className="text-xs">
                            {order.customer.firstName[0]}
                            {order.customer.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm">
                            {order.customer.firstName} {order.customer.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">{order.customer.email}</p>
                        </div>
                      </div>
                    ) : (
                      <div>
                        {/* The shipping address's own fullName (always present,
                            guest or not) is what still identifies this order
                            after a linked account is hard-deleted — its
                            userId goes null, but the address row (and its
                            name) is untouched, and guestEmail gets backfilled
                            with the deleted account's email at that point
                            (see users.service.ts's remove()). */}
                        <p className="text-sm">{order.address.fullName}</p>
                        <p className="text-xs text-muted-foreground">{order.guestEmail ?? 'Invité'}</p>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatDate(order.createdAt)}</TableCell>
                  <TableCell className="text-right">{order.items?.length ?? 0}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(order.total)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{order.paymentStatus}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <OrderStatusBadge status={order.status} />
                      <Select
                        value={order.status}
                        onValueChange={(status) => updateStatus.mutate({ id: order.id, status: status as OrderStatus })}
                      >
                        <SelectTrigger className="h-7 w-[130px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((s) => (
                            <SelectItem key={s} value={s} className="text-xs">
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedOrderId(order.id)}>
                      Voir
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {orders.data?.items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-sm text-muted-foreground">
                    Aucune commande
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
        {orders.data && (
          <PaginationFooter
            page={orders.data.page}
            totalPages={orders.data.totalPages}
            total={orders.data.total}
            pageSize={orders.data.pageSize}
            onPageChange={setPage}
          />
        )}
      </Card>

      <OrderDetailDialog
        order={selectedOrder}
        open={!!selectedOrder}
        onOpenChange={(open) => !open && setSelectedOrderId(null)}
      />
    </div>
  );
}
