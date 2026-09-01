import { z } from 'zod';
import { ProductionStatusSchema } from './enums';
import { PaginationQuerySchema } from './common.schema';

export const ProductionBatchSchema = z.object({
  id: z.string(),
  batchNumber: z.string(),
  variantId: z.string(),
  // Joined display fields (see production.service.ts's serializeBatch) —
  // the page needs these to show/search "what" a batch is producing without
  // a separate client-side variantId -> product lookup.
  productName: z.string(),
  categoryName: z.string(),
  sku: z.string(),
  size: z.string(),
  color: z.string(),
  plannedQty: z.number().int(),
  producedQty: z.number().int(),
  defectQty: z.number().int(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().nullable(),
  status: ProductionStatusSchema,
});
export type ProductionBatch = z.infer<typeof ProductionBatchSchema>;

export const CreateProductionBatchSchema = z.object({
  batchNumber: z.string().min(1).max(64),
  variantId: z.string().min(1),
  plannedQty: z.number().int().positive(),
  startDate: z.coerce.date(),
});
export type CreateProductionBatchInput = z.infer<typeof CreateProductionBatchSchema>;

export const UpdateProductionBatchSchema = z.object({
  producedQty: z.number().int().nonnegative().optional(),
  defectQty: z.number().int().nonnegative().optional(),
  status: ProductionStatusSchema.optional(),
  endDate: z.coerce.date().nullable().optional(),
});
export type UpdateProductionBatchInput = z.infer<typeof UpdateProductionBatchSchema>;

export const ProductionBatchQuerySchema = PaginationQuerySchema.extend({
  status: ProductionStatusSchema.optional(),
  categoryId: z.string().optional(),
  // Matches the batch number, or the SKU/product name of what it's producing.
  search: z.string().optional(),
});
export type ProductionBatchQuery = z.infer<typeof ProductionBatchQuerySchema>;
