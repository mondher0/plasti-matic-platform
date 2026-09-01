import { Link } from 'react-router-dom';
import { Minus, Package, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { formatCurrency } from '@plastimatic/shared';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetClose } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { useCart, useRemoveCartItem, useUpdateCartItem } from '../api/cart-api';

export function CartSheet() {
  const { data: cart } = useCart();
  const updateItem = useUpdateCartItem();
  const removeItem = useRemoveCartItem();

  const itemCount = cart?.totalItems ?? 0;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <ShoppingBag className="h-5 w-5" />
          {itemCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
              {itemCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col">
        <SheetHeader>
          <SheetTitle className="font-display">Mon panier</SheetTitle>
        </SheetHeader>

        {!cart?.items.length ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <ShoppingBag className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">Votre panier est vide</p>
            <SheetClose asChild>
              <Button asChild variant="outline" size="sm">
                <Link to="/">Continuer mes achats</Link>
              </Button>
            </SheetClose>
          </div>
        ) : (
          <div className="flex-1 space-y-4 overflow-y-auto py-4">
            {cart.items.map((item) => (
              <div key={item.id} className="flex gap-3">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
                  {item.image ? (
                    <img src={item.image} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Package className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.productName}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.size} / {item.color}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-6 w-6"
                      disabled={item.quantity <= 1}
                      onClick={() => updateItem.mutate({ itemId: item.id, quantity: item.quantity - 1 })}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-6 text-center text-sm">{item.quantity}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-6 w-6"
                      disabled={item.quantity >= item.availableQuantity}
                      onClick={() => updateItem.mutate({ itemId: item.id, quantity: item.quantity + 1 })}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="ml-auto h-6 w-6" onClick={() => removeItem.mutate(item.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <p className="shrink-0 text-sm font-medium">{formatCurrency(item.lineTotal)}</p>
              </div>
            ))}
          </div>
        )}

        {!!cart?.items.length && (
          <SheetFooter className="flex-col gap-3 sm:flex-col">
            <Separator />
            <div className="flex items-center justify-between font-medium">
              <span>Sous-total</span>
              <span className="text-lg text-primary">{formatCurrency(cart.subtotal)}</span>
            </div>
            <SheetClose asChild>
              <Button asChild size="lg" className="w-full">
                <Link to="/checkout">Passer commande</Link>
              </Button>
            </SheetClose>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
