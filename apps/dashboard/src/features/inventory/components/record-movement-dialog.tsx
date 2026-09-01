import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { CreateStockMovementSchema, type CreateStockMovementInput, type Product } from '@plastimatic/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useRecordMovement } from '../api/inventory-api';

export function RecordMovementDialog({ products, trigger }: { products: Product[]; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const recordMovement = useRecordMovement();
  const form = useForm<CreateStockMovementInput>({
    resolver: zodResolver(CreateStockMovementSchema),
    defaultValues: { variantId: '', type: 'IN', quantity: 1, reason: '' },
  });

  const onSubmit = async (values: CreateStockMovementInput) => {
    try {
      await recordMovement.mutateAsync(values);
      toast.success('Mouvement enregistré');
      form.reset({ variantId: '', type: 'IN', quantity: 1, reason: '' });
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Échec de l\'enregistrement');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouveau mouvement de stock</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="variantId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Variante</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Choisir un SKU…" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {products.flatMap((p) =>
                        (p.variants ?? []).map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            {p.name} — {v.size}/{v.color} ({v.sku})
                          </SelectItem>
                        )),
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="IN">Entrée</SelectItem>
                        <SelectItem value="OUT">Sortie</SelectItem>
                        <SelectItem value="ADJUSTMENT">Ajustement (+)</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantité</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motif (optionnel)</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex : réception fournisseur, casse…" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={recordMovement.isPending}>
                {recordMovement.isPending ? 'Enregistrement…' : 'Enregistrer'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
