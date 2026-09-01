import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { formatCurrency, formatDate } from '@plastimatic/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { TableSkeletonRows } from '@/components/table-skeleton';
import { ApiError } from '@/lib/api-client';
import { useUpdateVariant } from '@/features/catalog/api/catalog-api';
import { useMovements } from '../api/inventory-api';

const MOVEMENT_LABEL: Record<string, string> = { IN: 'Entrée', OUT: 'Sortie', ADJUSTMENT: 'Ajustement' };

export interface VariantRow {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  size: string;
  color: string;
  price: number;
  quantity: number;
  lowStockThreshold: number;
}

const ThresholdSchema = z.object({ lowStockThreshold: z.number().int().nonnegative() });

export function VariantDetailDialog({
  variant,
  open,
  onOpenChange,
}: {
  variant: VariantRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const movements = useMovements(variant?.id);
  const updateVariant = useUpdateVariant();
  const [editingThreshold, setEditingThreshold] = useState(false);

  const form = useForm({
    resolver: zodResolver(ThresholdSchema),
    values: { lowStockThreshold: variant?.lowStockThreshold ?? 0 },
  });

  if (!variant) return null;

  const onSubmitThreshold = async (values: { lowStockThreshold: number }) => {
    try {
      await updateVariant.mutateAsync({ productId: variant.productId, variantId: variant.id, input: values });
      toast.success('Seuil mis à jour');
      setEditingThreshold(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Échec de la mise à jour');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{variant.productName}</DialogTitle>
        </DialogHeader>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <dt className="text-muted-foreground">SKU</dt>
          <dd className="font-mono text-xs">{variant.sku}</dd>
          <dt className="text-muted-foreground">Taille / Couleur</dt>
          <dd>
            {variant.size} / {variant.color}
          </dd>
          <dt className="text-muted-foreground">Prix</dt>
          <dd>{formatCurrency(variant.price)}</dd>
          <dt className="text-muted-foreground">Stock actuel</dt>
          <dd>
            <Badge variant={variant.quantity <= variant.lowStockThreshold ? 'destructive' : 'default'}>
              {variant.quantity} unité(s)
            </Badge>
          </dd>
          <dt className="text-muted-foreground">Seuil d'alerte</dt>
          <dd>
            {editingThreshold ? (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmitThreshold)} className="flex items-center gap-2">
                  <FormField
                    control={form.control}
                    name="lowStockThreshold"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            className="h-7 w-20"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" size="sm" className="h-7" disabled={updateVariant.isPending}>
                    OK
                  </Button>
                </form>
              </Form>
            ) : (
              <button
                type="button"
                className="underline decoration-dotted underline-offset-2 hover:text-primary"
                onClick={() => setEditingThreshold(true)}
              >
                {variant.lowStockThreshold} — modifier
              </button>
            )}
          </dd>
        </dl>

        <Separator />

        <div>
          <p className="mb-2 text-sm font-medium">Historique des mouvements</p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Qté</TableHead>
                <TableHead>Motif</TableHead>
                <TableHead>Référence</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movements.isLoading && <TableSkeletonRows columns={5} rows={4} />}
              {movements.data?.items.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="text-xs text-muted-foreground">{formatDate(m.createdAt)}</TableCell>
                  <TableCell>{MOVEMENT_LABEL[m.type]}</TableCell>
                  <TableCell className="text-right">{m.quantity}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{m.reason ?? '—'}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{m.reference ?? '—'}</TableCell>
                </TableRow>
              ))}
              {movements.data?.items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                    Aucun mouvement enregistré
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
