import { z } from 'zod';

export const CartItemSchema = z.object({
  id: z.string(),
  variantId: z.string(),
  quantity: z.number().int().positive(),
});
export type CartItem = z.infer<typeof CartItemSchema>;

export const AddCartItemSchema = z.object({
  variantId: z.string().min(1),
  quantity: z.number().int().positive().max(999),
});
export type AddCartItemInput = z.infer<typeof AddCartItemSchema>;

export const UpdateCartItemSchema = z.object({
  quantity: z.number().int().positive().max(999),
});
export type UpdateCartItemInput = z.infer<typeof UpdateCartItemSchema>;

/** Enriched cart shape returned to the frontend — includes display data so the
 *  shop can render the cart without a second round-trip per item. */
export const CartLineSchema = z.object({
  id: z.string(),
  variantId: z.string(),
  productName: z.string(),
  productSlug: z.string(),
  image: z.string().nullable(),
  size: z.string(),
  color: z.string(),
  unitPrice: z.number(),
  quantity: z.number().int(),
  lineTotal: z.number(),
  availableQuantity: z.number().int(),
});
export type CartLine = z.infer<typeof CartLineSchema>;

export const CartResponseSchema = z.object({
  id: z.string(),
  items: z.array(CartLineSchema),
  subtotal: z.number(),
  totalItems: z.number().int(),
});
export type CartResponse = z.infer<typeof CartResponseSchema>;
