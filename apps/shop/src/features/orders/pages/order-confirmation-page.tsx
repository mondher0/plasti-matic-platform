import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { formatCurrency, formatDate } from '@plastimatic/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useOrder } from '../api/orders-api';

export function OrderConfirmationPage() {
  const { id = '' } = useParams();
  const { data: order, isLoading } = useOrder(id);

  if (isLoading) {
    return (
      <div className="container flex max-w-lg flex-col items-center py-16 text-center">
        <Skeleton className="mb-4 h-14 w-14 rounded-full" />
        <Skeleton className="h-7 w-64" />
        <Skeleton className="mt-2 h-4 w-48" />
        <Skeleton className="mt-6 h-40 w-full rounded-lg" />
      </div>
    );
  }
  if (!order) return <div className="container py-16 text-center text-muted-foreground">Commande introuvable.</div>;

  // Payment is confirmed asynchronously by a Stripe webhook (see
  // orders-api.ts's polling `refetchInterval`) — the redirect back from
  // Stripe can genuinely land here before that webhook does.
  if (order.paymentStatus === 'PENDING') {
    return (
      <div className="container flex max-w-lg flex-col items-center py-16 text-center">
        <Loader2 className="mb-4 h-14 w-14 animate-spin text-primary" />
        <h1 className="text-2xl font-semibold">Traitement du paiement…</h1>
        <p className="mt-1 text-muted-foreground">
          Commande n° {order.orderNumber} — cette page se met à jour automatiquement.
        </p>
      </div>
    );
  }

  if (order.paymentStatus === 'FAILED') {
    return (
      <div className="container flex max-w-lg flex-col items-center py-16 text-center">
        <XCircle className="mb-4 h-14 w-14 text-destructive" />
        <h1 className="text-2xl font-semibold">Le paiement a échoué</h1>
        <p className="mt-1 text-muted-foreground">
          Commande n° {order.orderNumber} — aucun montant n'a été débité.
        </p>
        <Button asChild className="mt-6">
          <Link to="/checkout">Réessayer</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container flex max-w-lg flex-col items-center py-16 text-center">
      <CheckCircle2 className="mb-4 h-14 w-14 text-status-good" />
      <h1 className="text-2xl font-semibold">Merci pour votre commande !</h1>
      <p className="mt-1 text-muted-foreground">Commande n° {order.orderNumber} — {formatDate(order.createdAt)}</p>

      <Card className="mt-6 w-full text-left">
        <CardHeader>
          <CardTitle className="text-base">Détails</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {order.items?.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span className="text-muted-foreground">Article × {item.quantity}</span>
              <span className="font-medium">{formatCurrency(item.lineTotal)}</span>
            </div>
          ))}
          <div className="flex justify-between border-t pt-2 font-semibold">
            <span>Total</span>
            <span>{formatCurrency(order.total)}</span>
          </div>
        </CardContent>
      </Card>

      <Button asChild className="mt-6">
        <Link to="/">Continuer mes achats</Link>
      </Button>
    </div>
  );
}
