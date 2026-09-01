import { z } from 'zod';
import { OrderStatusSchema, PaymentStatusSchema } from './enums';
import { PaginationQuerySchema } from './common.schema';

export const AddressInputSchema = z.object({
  fullName: z.string().min(1).max(150),
  phone: z.string().min(5).max(30),
  line1: z.string().min(1).max(200),
  line2: z.string().max(200).optional(),
  city: z.string().min(1).max(100),
  postalCode: z.string().min(1).max(20),
  country: z.string().min(1).max(100),
});
export type AddressInput = z.infer<typeof AddressInputSchema>;

export const OrderAddressSchema = AddressInputSchema.extend({ id: z.string(), line2: z.string().nullable() });
export type OrderAddress = z.infer<typeof OrderAddressSchema>;

/** The shop account that placed the order — null for a guest checkout. */
export const OrderCustomerSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email(),
  avatarUrl: z.string().url().nullable(),
});
export type OrderCustomer = z.infer<typeof OrderCustomerSchema>;

export const CheckoutSchema = z.object({
  address: AddressInputSchema,
  // `.optional()` alone only accepts `undefined` — an empty string is a
  // "present" value that still has to pass `.email()`, which it never does.
  // The shop's checkout form defaults this field to `''` (and doesn't even
  // render it for a logged-in customer, who can never change it away from
  // that default), so without the `''` escape hatch this field was
  // permanently invalid — and therefore checkout permanently blocked — for
  // every logged-in user. A guest leaving it truly blank still gets caught
  // by orders.service.ts's explicit "guestEmail is required" check.
  guestEmail: z.string().email().optional().or(z.literal('')),
});
export type CheckoutInput = z.infer<typeof CheckoutSchema>;

/** Checkout no longer returns the (not-yet-paid) Order directly — payment
 *  is confirmed asynchronously by a Stripe webhook — it returns the URL to
 *  redirect the browser to instead. */
export const CheckoutSessionResponseSchema = z.object({
  checkoutUrl: z.string().url(),
});
export type CheckoutSessionResponse = z.infer<typeof CheckoutSessionResponseSchema>;

export const UpdateOrderStatusSchema = z.object({
  status: OrderStatusSchema,
});
export type UpdateOrderStatusInput = z.infer<typeof UpdateOrderStatusSchema>;

export const OrderItemSchema = z.object({
  id: z.string(),
  variantId: z.string(),
  productName: z.string(),
  sku: z.string(),
  size: z.string(),
  color: z.string(),
  quantity: z.number().int(),
  unitPrice: z.number(),
  lineTotal: z.number(),
});
export type OrderItem = z.infer<typeof OrderItemSchema>;

export const OrderSchema = z.object({
  id: z.string(),
  orderNumber: z.string(),
  status: OrderStatusSchema,
  paymentStatus: PaymentStatusSchema,
  subtotal: z.number(),
  total: z.number(),
  createdAt: z.coerce.date(),
  confirmedAt: z.coerce.date().nullable(),
  shippedAt: z.coerce.date().nullable(),
  deliveredAt: z.coerce.date().nullable(),
  customer: OrderCustomerSchema.nullable(),
  guestEmail: z.string().nullable(),
  address: OrderAddressSchema,
  items: z.array(OrderItemSchema).optional(),
});
export type Order = z.infer<typeof OrderSchema>;

export const OrderQuerySchema = PaginationQuerySchema.extend({
  status: OrderStatusSchema.optional(),
  paymentStatus: PaymentStatusSchema.optional(),
  // Matches the order number, or the customer's name/email — the account's
  // if it's linked, otherwise the guest email captured at checkout.
  search: z.string().optional(),
});
export type OrderQuery = z.infer<typeof OrderQuerySchema>;
