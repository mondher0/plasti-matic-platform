import { useState } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm } from 'react-hook-form';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Product } from '@plastimatic/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
import { ApiError } from '@/lib/api-client';
import { useCategories, useUpdateProduct, useAddVariant, useUpdateVariant } from '../api/catalog-api';
import { ImageUploadField } from './image-upload-field';

// Mirrors the constraints in packages/shared/src/schemas/catalog.schema.ts —
// kept local because this form mixes an update (product) and a set of
// per-row creates/updates (variants), which the shared schemas model as
// separate request shapes.
const EditVariantSchema = z.object({
  id: z.string().optional(),
  sku: z.string().min(1).max(64),
  size: z.string().min(1).max(32),
  color: z.string().min(1).max(32),
  price: z.number().positive(),
  costPrice: z.number().nonnegative(),
  lowStockThreshold: z.number().int().nonnegative(),
});
const EditProductFormSchema = z.object({
  name: z.string().min(1).max(150),
  slug: z.string().min(1).max(150).regex(/^[a-z0-9-]+$/, 'lowercase, digits and dashes only'),
  description: z.string().max(4000).optional(),
  categoryId: z.string().min(1),
  isActive: z.boolean(),
  images: z.array(z.string().url()),
  variants: z.array(EditVariantSchema).min(1, 'At least one variant is required'),
});
type EditProductFormValues = z.infer<typeof EditProductFormSchema>;

function toFormValues(product: Product): EditProductFormValues {
  return {
    name: product.name,
    slug: product.slug,
    description: product.description ?? '',
    categoryId: product.categoryId,
    isActive: product.isActive,
    images: product.images,
    variants: (product.variants ?? []).map((v) => ({
      id: v.id,
      sku: v.sku,
      size: v.size,
      color: v.color,
      price: v.price,
      costPrice: v.costPrice,
      lowStockThreshold: v.lowStockThreshold,
    })),
  };
}

export function ProductEditDialog({ product, trigger }: { product: Product; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const categories = useCategories();
  const updateProduct = useUpdateProduct();
  const addVariant = useAddVariant();
  const updateVariant = useUpdateVariant();
  const isSaving = updateProduct.isPending || addVariant.isPending || updateVariant.isPending;

  const form = useForm<EditProductFormValues>({
    resolver: zodResolver(EditProductFormSchema),
    values: toFormValues(product),
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'variants' });

  const onSubmit = async (values: EditProductFormValues) => {
    try {
      // 1. Product-level fields — only send what actually changed.
      const productChanges: Record<string, unknown> = {};
      if (values.name !== product.name) productChanges.name = values.name;
      if (values.slug !== product.slug) productChanges.slug = values.slug;
      if ((values.description || null) !== product.description) productChanges.description = values.description;
      if (values.categoryId !== product.categoryId) productChanges.categoryId = values.categoryId;
      if (values.isActive !== product.isActive) productChanges.isActive = values.isActive;
      if (JSON.stringify(values.images) !== JSON.stringify(product.images)) productChanges.images = values.images;
      if (Object.keys(productChanges).length > 0) {
        await updateProduct.mutateAsync({ id: product.id, input: productChanges });
      }

      // 2. Variants — update rows that changed, create rows that are new.
      for (const variant of values.variants) {
        if (variant.id) {
          const original = product.variants?.find((v) => v.id === variant.id);
          if (!original) continue;
          const diff: Record<string, unknown> = {};
          if (variant.sku !== original.sku) diff.sku = variant.sku;
          if (variant.size !== original.size) diff.size = variant.size;
          if (variant.color !== original.color) diff.color = variant.color;
          if (variant.price !== original.price) diff.price = variant.price;
          if (variant.costPrice !== original.costPrice) diff.costPrice = variant.costPrice;
          if (variant.lowStockThreshold !== original.lowStockThreshold) diff.lowStockThreshold = variant.lowStockThreshold;
          if (Object.keys(diff).length > 0) {
            await updateVariant.mutateAsync({ productId: product.id, variantId: variant.id, input: diff });
          }
        } else {
          await addVariant.mutateAsync({
            productId: product.id,
            input: { ...variant, quantity: 0 },
          });
        }
      }

      toast.success('Produit mis à jour');
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Échec de la mise à jour');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier {product.name}</DialogTitle>
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
                          <SelectValue />
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
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-md border p-3 sm:col-span-2">
                    <FormLabel className="!mt-0">Produit actif</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
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
                <Label>Variantes</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    append({ sku: '', size: '', color: '', price: 0, costPrice: 0, lowStockThreshold: 10 })
                  }
                >
                  <Plus className="mr-1 h-3.5 w-3.5" /> Ajouter
                </Button>
              </div>
              <div className="space-y-2">
                {fields.map((arrayField, index) => {
                  // `arrayField.id` is react-hook-form's own row key (always
                  // present); the *database* id lives in the form values and
                  // is only set for a variant that already exists.
                  const existingVariantId = form.watch(`variants.${index}.id`);
                  return (
                  <div key={arrayField.id} className="space-y-1">
                    <div className="grid grid-cols-2 items-end gap-2 rounded-md border p-2 sm:grid-cols-7">
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
                        name={`variants.${index}.lowStockThreshold`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Seuil</FormLabel>
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
                        disabled={fields.length === 1 || !!existingVariantId}
                        title={
                          existingVariantId
                            ? "Suppression indisponible depuis l'édition — désactivez le produit si besoin"
                            : undefined
                        }
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    {!existingVariantId && (
                      <p className="pl-2 text-xs text-muted-foreground">
                        Nouvelle variante — stock initial à 0, approvisionnez-la depuis la page Stock.
                      </p>
                    )}
                  </div>
                  );
                })}
              </div>
            </div>

            <DialogFooter>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Enregistrement…' : 'Enregistrer'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
