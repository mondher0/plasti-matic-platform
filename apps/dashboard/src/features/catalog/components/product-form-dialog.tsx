import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm } from 'react-hook-form';
import { Plus, Trash2 } from 'lucide-react';
import { CreateProductSchema, type CreateProductInput } from '@plastimatic/shared';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useCategories, useCreateProduct } from '../api/catalog-api';
import { ImageUploadField } from './image-upload-field';

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

const EMPTY_VARIANT = { sku: '', size: '', color: '', price: 0, costPrice: 0, quantity: 0, lowStockThreshold: 10 };

export function ProductFormDialog({ trigger }: { trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const categories = useCategories();
  const createProduct = useCreateProduct();

  const form = useForm<CreateProductInput>({
    resolver: zodResolver(CreateProductSchema),
    defaultValues: {
      name: '',
      slug: '',
      description: '',
      images: [],
      isActive: true,
      categoryId: '',
      variants: [EMPTY_VARIANT],
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'variants' });
  const name = form.watch('name');

  useEffect(() => {
    if (name) form.setValue('slug', slugify(name));
  }, [name, form]);

  const onSubmit = async (values: CreateProductInput) => {
    try {
      await createProduct.mutateAsync(values);
      toast.success('Produit créé');
      form.reset({ name: '', slug: '', description: '', images: [], isActive: true, categoryId: '', variants: [EMPTY_VARIANT] });
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Échec de la création');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouveau produit</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Nom</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Catégorie</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Choisir…" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.data?.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Slug</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea rows={3} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="images"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Images</FormLabel>
                  <FormControl>
                    <ImageUploadField value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              <div className="mb-2 flex items-center justify-between">
                <Label>Variantes (taille / couleur)</Label>
                <Button type="button" size="sm" variant="outline" onClick={() => append(EMPTY_VARIANT)}>
                  <Plus className="mr-1 h-3.5 w-3.5" /> Ajouter
                </Button>
              </div>
              <div className="space-y-2">
                {fields.map((field, index) => (
                  <div key={field.id} className="grid grid-cols-2 items-end gap-2 rounded-md border p-2 sm:grid-cols-8">
                    <FormField
                      control={form.control}
                      name={`variants.${index}.sku`}
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel className="text-xs">SKU</FormLabel>
                          <FormControl>
                            <Input className="h-8" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`variants.${index}.size`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Taille</FormLabel>
                          <FormControl>
                            <Input className="h-8" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`variants.${index}.color`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Couleur</FormLabel>
                          <FormControl>
                            <Input className="h-8" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`variants.${index}.price`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Prix</FormLabel>
                          <FormControl>
                            <Input
                              className="h-8"
                              type="number"
                              step="0.01"
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`variants.${index}.costPrice`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Coût</FormLabel>
                          <FormControl>
                            <Input
                              className="h-8"
                              type="number"
                              step="0.01"
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`variants.${index}.quantity`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Stock initial</FormLabel>
                          <FormControl>
                            <Input
                              className="h-8"
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="col-span-2 h-8 w-8 justify-self-end sm:col-span-1"
                      disabled={fields.length === 1}
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button type="submit" disabled={createProduct.isPending}>
                {createProduct.isPending ? 'Création…' : 'Créer le produit'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
