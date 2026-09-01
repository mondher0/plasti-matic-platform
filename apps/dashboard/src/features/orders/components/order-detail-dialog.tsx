import type { Order, OrderStatus } from '@plastimatic/shared';
import { formatCurrency, formatDate } from '@plastimatic/shared';
import { OrderStatusBadge } from '@/components/status-badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useUpdateOrderStatus } from '../api/orders-api';

const STATUSES: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

export function OrderDetailDialog({
  order,
  open,
  onOpenChange,
}: {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const updateStatus = useUpdateOrderStatus();
  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Commande {order.orderNumber}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <p className="mb-1 text-sm font-medium">Client</p>
            {order.customer ? (
              <div className="flex items-center gap-2">
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarImage src={order.customer.avatarUrl ?? undefined} />
                  <AvatarFallback className="text-xs">
                    {order.customer.firstName[0]}
                    {order.customer.lastName[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="text-sm">
                  <p>
                    {order.customer.firstName} {order.customer.lastName}
                  </p>
                  <p className="text-muted-foreground">{order.customer.email}</p>
                </div>
              </div>
            ) : (
              <div className="text-sm">
                {/* Same fallback as the list page: the shipping address's own
                    fullName still identifies this order even after a linked
                    account is hard-deleted (userId -> null), and guestEmail
                    gets backfilled with the deleted account's email at that
                    point (see users.service.ts's remove()). */}
                <p>{order.address.fullName}</p>
                <p className="text-muted-foreground">{order.guestEmail ?? 'Invité'}</p>
              </div>
            )}
          </div>

          <div>
            <p className="mb-1 text-sm font-medium">Adresse de livraison</p>
            <div className="text-sm text-muted-foreground">
              <p>{order.address.fullName}</p>
              <p>{order.address.phone}</p>
              <p>
                {order.address.line1}
                {order.address.line2 ? `, ${order.address.line2}` : ''}
              </p>
              <p>
                {order.address.postalCode} {order.address.city}, {order.address.country}
              </p>
            </div>
          </div>
        </div>

        <Separator />

        <div className="flex flex-wrap items-center gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Statut</p>
            <div className="mt-1 flex items-center gap-2">
              <OrderStatusBadge status={order.status} />
              <Select
                value={order.status}
                onValueChange={(status) => updateStatus.mutate({ id: order.id, status: status as OrderStatus })}
              >
                <SelectTrigger className="h-7 w-[140px] text-xs">
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
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Paiement</p>
            <p className="text-sm">{order.paymentStatus}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Passée le</p>
            <p className="text-sm">{formatDate(order.createdAt)}</p>
          </div>
          {order.confirmedAt && (
            <div>
              <p className="text-xs text-muted-foreground">Confirmée le</p>
              <p className="text-sm">{formatDate(order.confirmedAt)}</p>
            </div>
          )}
          {order.shippedAt && (
            <div>
              <p className="text-xs text-muted-foreground">Expédiée le</p>
              <p className="text-sm">{formatDate(order.shippedAt)}</p>
            </div>
          )}
          {order.deliveredAt && (
            <div>
              <p className="text-xs text-muted-foreground">Livrée le</p>
              <p className="text-sm">{formatDate(order.deliveredAt)}</p>
            </div>
          )}
        </div>

        <Separator />

        <div>
          <p className="mb-2 text-sm font-medium">Articles</p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produit</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead className="text-right">Qté</TableHead>
                <TableHead className="text-right">Prix unitaire</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.items?.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <p className="font-medium">{item.productName}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.size} / {item.color}
                    </p>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{item.sku}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.lineTotal)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="mt-3 flex justify-end">
            <div className="w-48 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sous-total</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span>{formatCurrency(order.total)}</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
