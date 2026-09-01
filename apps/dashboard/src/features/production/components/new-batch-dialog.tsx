import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { CreateProductionBatchSchema, type CreateProductionBatchInput, type Product } from '@plastimatic/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useCreateProductionBatch } from '../api/production-api';

export function NewBatchDialog({ products, trigger }: { products: Product[]; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const createBatch = useCreateProductionBatch();
  const form = useForm<CreateProductionBatchInput>({
    resolver: zodResolver(CreateProductionBatchSchema),
    defaultValues: { batchNumber: '', variantId: '', plannedQty: 100, startDate: new Date() },
  });

  const onSubmit = async (values: CreateProductionBatchInput) => {
    try {
      await createBatch.mutateAsync(values);
      toast.success('Lot de production créé');
      form.reset({ batchNumber: '', variantId: '', plannedQty: 100, startDate: new Date() });
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Échec de la création');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouveau lot de production</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="batchNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>N° de lot</FormLabel>
                  <FormControl>
                    <Input placeholder="BATCH-2026-001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
            <FormField
              control={form.control}
              name="plannedQty"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantité planifiée</FormLabel>
                  <FormControl>
                    <Input type="number" min={1} {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={createBatch.isPending}>
                {createBatch.isPending ? 'Création…' : 'Créer le lot'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
