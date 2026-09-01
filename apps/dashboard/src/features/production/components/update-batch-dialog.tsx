import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { UpdateProductionBatchSchema, type ProductionBatch, type UpdateProductionBatchInput } from '@plastimatic/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useUpdateProductionBatch } from '../api/production-api';

export function UpdateBatchDialog({ batch, trigger }: { batch: ProductionBatch; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const updateBatch = useUpdateProductionBatch();
  const form = useForm<UpdateProductionBatchInput>({
    resolver: zodResolver(UpdateProductionBatchSchema),
    defaultValues: { producedQty: batch.producedQty, defectQty: batch.defectQty, status: batch.status },
  });

  const onSubmit = async (values: UpdateProductionBatchInput) => {
    try {
      await updateBatch.mutateAsync({ id: batch.id, input: values });
      toast.success('Lot mis à jour');
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Échec de la mise à jour');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Mettre à jour le lot {batch.batchNumber}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="producedQty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantité produite</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="defectQty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Défauts</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Statut</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="PLANNED">Planifié</SelectItem>
                      <SelectItem value="IN_PROGRESS">En cours</SelectItem>
                      <SelectItem value="COMPLETED">Terminé</SelectItem>
                      <SelectItem value="CANCELLED">Annulé</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Passer à « Terminé » ajoute automatiquement la quantité produite au stock.
                  </p>
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={updateBatch.isPending}>
                {updateBatch.isPending ? 'Mise à jour…' : 'Enregistrer'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
