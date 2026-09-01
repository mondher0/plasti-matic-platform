import { z } from 'zod';
import { PaginationQuerySchema } from './common.schema';

export const CategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
});
export type Category = z.infer<typeof CategorySchema>;

export const CreateCategorySchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, 'lowercase, digits and dashes only'),
});
export type CreateCategoryInput = z.infer<typeof CreateCategorySchema>;

export const ProductVariantSchema = z.object({
  id: z.string(),
  productId: z.string(),
  sku: z.string(),
  size: z.string(),
  color: z.string(),
  price: z.number(),
  costPrice: z.number(),
  quantity: z.number().int(),
  lowStockThreshold: z.number().int(),
});
export type ProductVariant = z.infer<typeof ProductVariantSchema>;

export const CreateProductVariantSchema = z.object({
  sku: z.string().min(1).max(64),
  size: z.string().min(1).max(32),
  color: z.string().min(1).max(32),
  price: z.number().positive(),
  costPrice: z.number().nonnegative(),
  quantity: z.number().int().nonnegative().default(0),
  lowStockThreshold: z.number().int().nonnegative().default(10),
});
export type CreateProductVariantInput = z.infer<typeof CreateProductVariantSchema>;

// Quantity is deliberately excluded here: stock is only ever changed through
// a StockMovement (see inventory.schema.ts) so the ledger and the live
// balance never drift apart. Editing a variant only touches its descriptive
// and pricing fields.
export const UpdateProductVariantSchema = z.object({
  sku: z.string().min(1).max(64).optional(),
  size: z.string().min(1).max(32).optional(),
  color: z.string().min(1).max(32).optional(),
  price: z.number().positive().optional(),
  costPrice: z.number().nonnegative().optional(),
  lowStockThreshold: z.number().int().nonnegative().optional(),
});
export type UpdateProductVariantInput = z.infer<typeof UpdateProductVariantSchema>;

export const ProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  images: z.array(z.string()),
  isActive: z.boolean(),
  categoryId: z.string(),
  category: CategorySchema.optional(),
  variants: z.array(ProductVariantSchema).optional(),
  createdAt: z.coerce.date(),
});
export type Product = z.infer<typeof ProductSchema>;

export const CreateProductSchema = z.object({
  name: z.string().min(1).max(150),
  slug: z.string().min(1).max(150).regex(/^[a-z0-9-]+$/, 'lowercase, digits and dashes only'),
  description: z.string().max(4000).optional(),
  images: z.array(z.string().url()).default([]),
  isActive: z.boolean().default(true),
  categoryId: z.string().min(1),
  variants: z.array(CreateProductVariantSchema).min(1, 'At least one variant is required'),
});
export type CreateProductInput = z.infer<typeof CreateProductSchema>;

export const UpdateProductSchema = CreateProductSchema.omit({ variants: true }).partial();
export type UpdateProductInput = z.infer<typeof UpdateProductSchema>;

export const ProductQuerySchema = PaginationQuerySchema.extend({
  search: z.string().optional(),
  categoryId: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
});
export type ProductQuery = z.infer<typeof ProductQuerySchema>;
