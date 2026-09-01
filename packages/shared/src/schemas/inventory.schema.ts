import { z } from 'zod';
import { StockMovementTypeSchema } from './enums';
import { PaginationQuerySchema } from './common.schema';

export const StockMovementSchema = z.object({
  id: z.string(),
  variantId: z.string(),
  type: StockMovementTypeSchema,
  quantity: z.number().int().positive(),
  reason: z.string().nullable(),
  reference: z.string().nullable(),
  createdAt: z.coerce.date(),
});
export type StockMovement = z.infer<typeof StockMovementSchema>;

export const CreateStockMovementSchema = z.object({
  variantId: z.string().min(1),
  type: StockMovementTypeSchema,
  quantity: z.number().int().positive(),
  reason: z.string().max(300).optional(),
  reference: z.string().max(100).optional(),
});
export type CreateStockMovementInput = z.infer<typeof CreateStockMovementSchema>;

export const LowStockItemSchema = z.object({
  variantId: z.string(),
  sku: z.string(),
  productName: z.string(),
  size: z.string(),
  color: z.string(),
  quantity: z.number().int(),
  lowStockThreshold: z.number().int(),
});
export type LowStockItem = z.infer<typeof LowStockItemSchema>;

export const MovementQuerySchema = PaginationQuerySchema.extend({
  variantId: z.string().optional(),
  type: StockMovementTypeSchema.optional(),
  // Matches against the movement's own reason text, or the SKU/product name
  // of the variant it's on — a movement row has no name of its own, so
  // "search" has to reach through the variant it belongs to.
  search: z.string().optional(),
});
export type MovementQuery = z.infer<typeof MovementQuerySchema>;

/** A flat, product-joined row for the Stock page's "Niveaux de stock" list —
 *  paginated (infinite scroll) independently of the Catalogue's product view. */
export const StockVariantSchema = z.object({
  id: z.string(),
  productId: z.string(),
  productName: z.string(),
  categoryName: z.string(),
  sku: z.string(),
  size: z.string(),
  color: z.string(),
  price: z.number(),
  quantity: z.number().int(),
  lowStockThreshold: z.number().int(),
});
export type StockVariant = z.infer<typeof StockVariantSchema>;

export const StockStatusFilterSchema = z.enum(['LOW', 'OK']);
export type StockStatusFilter = z.infer<typeof StockStatusFilterSchema>;

export const StockVariantQuerySchema = PaginationQuerySchema.extend({
  // Matches product name or SKU.
  search: z.string().optional(),
  categoryId: z.string().optional(),
  // LOW = quantity <= lowStockThreshold (the same rule the "Stock bas" badge
  // uses), OK = everything else.
  status: StockStatusFilterSchema.optional(),
});
export type StockVariantQuery = z.infer<typeof StockVariantQuerySchema>;
