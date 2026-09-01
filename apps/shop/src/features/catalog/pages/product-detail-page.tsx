import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Package, RotateCcw, ShieldCheck, Truck } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@plastimatic/shared';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ApiError } from '@/lib/api-client';
import { useProductBySlug } from '../api/catalog-api';
import { useAddCartItem } from '@/features/cart/api/cart-api';

const TRUST_SIGNALS = [
  { icon: Truck, label: 'Livraison rapide' },
  { icon: ShieldCheck, label: 'Paiement sécurisé' },
  { icon: RotateCcw, label: 'Retours faciles' },
];

export function ProductDetailPage() {
  const { slug = '' } = useParams();
  const { data: product, isLoading } = useProductBySlug(slug);
  const addItem = useAddCartItem();

  const variants = product?.variants ?? [];
  const sizes = useMemo(() => [...new Set(variants.map((v) => v.size))], [variants]);

  const [activeImage, setActiveImage] = useState(0);
  const [size, setSize] = useState<string>();
  const [color, setColor] = useState<string>();
  const [quantity, setQuantity] = useState(1);

  // Colors narrow to only what actually pairs with the chosen size (or, with
  // no size chosen yet, every color across all variants) — the previous
  // implementation offered two fully independent dropdowns, which let you
  // "select" a size+color combination that had no matching ProductVariant.
  const colorsForSize = useMemo(
    () => [...new Set(variants.filter((v) => !size || v.size === size).map((v) => v.color))],
    [variants, size],
  );

  // A product with only one possible size or color never needs the shopper
  // to choose it — auto-select so a single-dimension product (e.g. one
  // size, several colors) is a single click away from being addable.
  useEffect(() => {
    if (sizes.length === 1) setSize(sizes[0]);
  }, [sizes]);
  useEffect(() => {
    if (color && !colorsForSize.includes(color)) setColor(undefined);
    if (colorsForSize.length === 1) setColor(colorsForSize[0]);
  }, [colorsForSize, color]);

  const selectedVariant = variants.find((v) => v.size === size && v.color === color);

  if (isLoading) {
    return (
      <div className="container grid grid-cols-1 gap-8 py-8 md:grid-cols-2">
        <Skeleton className="aspect-square w-full" />
        <div className="space-y-4">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  if (!product) {
    return <div className="container py-16 text-center text-muted-foreground">Produit introuvable.</div>;
  }

  const handleAddToCart = async () => {
    if (!selectedVariant) {
      toast.error('Choisissez une taille et une couleur');
      return;
    }
    try {
      await addItem.mutateAsync({ variantId: selectedVariant.id, quantity });
      toast.success('Ajouté au panier');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Échec de l'ajout au panier");
    }
  };

  const images = product.images.length ? product.images : [null];

  return (
    <div className="container grid grid-cols-1 gap-10 py-8 md:grid-cols-2">
      <div className="flex gap-3">
        {images.length > 1 && (
          <div className="flex shrink-0 flex-col gap-2">
            {images.map((src, i) => (
              <button
                key={src ?? i}
                type="button"
                onClick={() => setActiveImage(i)}
                className={cn(
                  'h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 bg-muted transition-colors',
                  activeImage === i ? 'border-primary' : 'border-transparent',
                )}
              >
                {src && <img src={src} alt="" className="h-full w-full object-cover" />}
              </button>
            ))}
          </div>
        )}
        <div className="flex aspect-square flex-1 items-center justify-center overflow-hidden rounded-xl bg-muted">
          {images[activeImage] ? (
            <img src={images[activeImage]!} alt={product.name} className="h-full w-full object-cover" />
          ) : (
            <Package className="h-20 w-20 text-muted-foreground" />
          )}
        </div>
      </div>

      <div className="space-y-5">
        <div>
          <p className="text-sm uppercase tracking-wide text-muted-foreground">{product.category?.name}</p>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">{product.name}</h1>
        </div>

        <p className="text-3xl font-semibold text-primary">
          {selectedVariant ? formatCurrency(selectedVariant.price) : formatCurrency(Math.min(...(variants.map((v) => v.price) ?? [0])))}
        </p>

        {sizes.length > 1 && (
          <div>
            <p className="mb-2 text-sm font-medium">Taille</p>
            <div className="flex flex-wrap gap-2">
              {sizes.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSize(s)}
                  className={cn(
                    'rounded-md border px-3.5 py-1.5 text-sm font-medium transition-colors',
                    size === s
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border hover:border-primary/50',
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {colorsForSize.length > 1 && (
          <div>
            <p className="mb-2 text-sm font-medium">Couleur</p>
            <div className="flex flex-wrap gap-2">
              {colorsForSize.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    'rounded-md border px-3.5 py-1.5 text-sm font-medium transition-colors',
                    color === c
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border hover:border-primary/50',
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedVariant && (
          <p className="text-sm text-muted-foreground">
            {selectedVariant.quantity > 0 ? `${selectedVariant.quantity} en stock` : 'Rupture de stock'}
          </p>
        )}

        <div className="flex items-center gap-3">
          <Input
            type="number"
            min={1}
            max={selectedVariant?.quantity ?? 99}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className="w-20"
          />
          <Button
            size="lg"
            className="flex-1"
            disabled={!selectedVariant || selectedVariant.quantity === 0 || addItem.isPending}
            onClick={handleAddToCart}
          >
            {addItem.isPending ? 'Ajout…' : 'Ajouter au panier'}
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-2 rounded-lg border bg-secondary/40 p-4">
          {TRUST_SIGNALS.map(({ icon: Icon, label }) => (
            <div key={label} className="flex flex-col items-center gap-1.5 text-center">
              <Icon className="h-5 w-5 text-primary" />
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>

        {product.description && (
          <Accordion type="single" collapsible defaultValue="description">
            <AccordionItem value="description">
              <AccordionTrigger className="text-sm font-medium">Description</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{product.description}</AccordionContent>
            </AccordionItem>
          </Accordion>
        )}
      </div>
    </div>
  );
}
