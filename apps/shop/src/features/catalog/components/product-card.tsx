import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Package, Plus } from 'lucide-react';
import { formatCurrency, type Product } from '@plastimatic/shared';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ApiError } from '@/lib/api-client';
import { useAddCartItem } from '@/features/cart/api/cart-api';

const NEW_WINDOW_DAYS = 14;

export function ProductCard({ product }: { product: Product }) {
  const variants = product.variants ?? [];
  const prices = variants.map((v) => v.price);
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const totalStock = variants.reduce((s, v) => s + v.quantity, 0);
  const isNew = Date.now() - new Date(product.createdAt).getTime() < NEW_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  // A quick "Ajouter" only makes sense when there's exactly one real SKU —
  // with several size/color combinations we can't guess which one the
  // shopper wants, so those still route through the product page instead.
  const singleVariant = variants.length === 1 ? variants[0] : null;

  const addItem = useAddCartItem();
  const handleQuickAdd = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!singleVariant) return;
    try {
      await addItem.mutateAsync({ variantId: singleVariant.id, quantity: 1 });
      toast.success('Ajouté au panier');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Échec de l'ajout au panier");
    }
  };

  return (
    <Link to={`/products/${product.slug}`} className="group block">
      <Card className="h-full overflow-hidden border-border/60 transition-all group-hover:-translate-y-0.5 group-hover:shadow-lg">
        <div className="relative flex aspect-square items-center justify-center overflow-hidden bg-muted">
          {product.images[0] ? (
            <img
              src={product.images[0]}
              alt={product.name}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <Package className="h-12 w-12 text-muted-foreground" />
          )}

          {isNew && <Badge className="absolute left-2 top-2 bg-primary text-primary-foreground">Nouveau</Badge>}
          {totalStock === 0 && (
            <Badge variant="secondary" className="absolute left-2 top-2 bg-background/90">
              Rupture de stock
            </Badge>
          )}

          {singleVariant && totalStock > 0 && (
            <button
              type="button"
              onClick={handleQuickAdd}
              disabled={addItem.isPending}
              className="absolute bottom-2 right-2 flex h-9 w-9 translate-y-2 items-center justify-center rounded-full bg-primary text-primary-foreground opacity-0 shadow-md transition-all duration-200 hover:bg-primary/90 disabled:opacity-50 group-hover:translate-y-0 group-hover:opacity-100"
              aria-label="Ajouter au panier"
            >
              <Plus className="h-4 w-4" />
            </button>
          )}
        </div>
        <CardContent className="space-y-1 p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{product.category?.name}</p>
          <h3 className="line-clamp-1 font-medium">{product.name}</h3>
          <div className="flex items-center justify-between pt-1">
            <span className="font-semibold text-foreground">{formatCurrency(minPrice)}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
