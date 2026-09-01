import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { CheckoutSchema, formatCurrency, type CheckoutInput } from '@plastimatic/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useCart } from '@/features/cart/api/cart-api';
import { useAuth } from '@/features/auth/auth-context';
import { useCheckout } from '../api/orders-api';

export function CheckoutPage() {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { data: cart } = useCart();
  const checkout = useCheckout();

  // Landed back here from Stripe's "back" link (cancel_url) — the order it
  // created stays PENDING/unpaid forever (no cleanup job, see README), the
  // cart is already gone though, so just let them know nothing was charged.
  useEffect(() => {
    if (searchParams.get('canceled') === 'true') {
      toast.info('Paiement annulé — aucun montant n\'a été débité.');
    }
  }, [searchParams]);

  const form = useForm<CheckoutInput>({
    resolver: zodResolver(CheckoutSchema),
    defaultValues: {
      address: { fullName: '', phone: '', line1: '', line2: '', city: '', postalCode: '', country: 'Algérie' },
      guestEmail: '',
    },
  });

  const onSubmit = async (values: CheckoutInput) => {
    try {
      const { checkoutUrl } = await checkout.mutateAsync(values);
      // A full page navigation, not React Router — Stripe's hosted payment
      // page is a different origin entirely.
      window.location.href = checkoutUrl;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Échec de la commande');
    }
  };

  // react-hook-form silently refuses to call onSubmit when validation fails
  // — with no feedback at all, that reads as "I clicked Payer and nothing
  // happened", especially since the actual FormMessage for an empty/invalid
  // field can easily be scrolled out of view above the button by the time
  // someone gets to the bottom of this form. Surface it explicitly instead:
  // a toast plus focus (which scrolls it into view) on the first bad field.
  const onInvalid = (errors: typeof form.formState.errors) => {
    toast.error('Veuillez corriger les champs en surbrillance ci-dessus.');
    const firstField =
      errors.guestEmail ? 'guestEmail' :
      errors.address?.fullName ? 'address.fullName' :
      errors.address?.phone ? 'address.phone' :
      errors.address?.line1 ? 'address.line1' :
      errors.address?.city ? 'address.city' :
      errors.address?.postalCode ? 'address.postalCode' :
      errors.address?.country ? 'address.country' :
      undefined;
    if (firstField) form.setFocus(firstField);
  };

  if (!cart?.items.length) {
    return <div className="container py-16 text-center text-muted-foreground">Votre panier est vide.</div>;
  }

  return (
    <div className="container grid grid-cols-1 gap-8 py-8 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Livraison</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-4">
              {!user && (
                <FormField
                  control={form.control}
                  name="guestEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email (commande invité)</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <FormField
                control={form.control}
                name="address.fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom complet</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address.phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Téléphone</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address.line1"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adresse</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="address.city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ville</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="address.postalCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Code postal</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="address.country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pays</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <p className="text-xs text-muted-foreground">
                Vous serez redirigé vers la page de paiement sécurisée Stripe.
              </p>
              <Button type="submit" className="w-full" disabled={checkout.isPending}>
                {checkout.isPending ? 'Redirection…' : `Payer ${formatCurrency(cart.subtotal)}`}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Récapitulatif</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {cart.items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {item.productName} ({item.size}/{item.color}) × {item.quantity}
              </span>
              <span className="font-medium">{formatCurrency(item.lineTotal)}</span>
            </div>
          ))}
          <Separator />
          <div className="flex justify-between font-semibold">
            <span>Total</span>
            <span>{formatCurrency(cart.subtotal)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
