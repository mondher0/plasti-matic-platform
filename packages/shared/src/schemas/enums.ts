import { z } from 'zod';

/**
 * Enum sources of truth, shared by the Prisma schema (kept in manual sync —
 * see apps/api/prisma/schema.prisma), the NestJS DTOs and both frontends.
 */

export const RoleSchema = z.enum(['ADMIN', 'STAFF', 'CUSTOMER']);
export type Role = z.infer<typeof RoleSchema>;

export const UserStatusSchema = z.enum(['ACTIVE', 'BLOCKED', 'DELETED']);
export type UserStatus = z.infer<typeof UserStatusSchema>;

export const StockMovementTypeSchema = z.enum(['IN', 'OUT', 'ADJUSTMENT']);
export type StockMovementType = z.infer<typeof StockMovementTypeSchema>;

export const ProductionStatusSchema = z.enum([
  'PLANNED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
]);
export type ProductionStatus = z.infer<typeof ProductionStatusSchema>;

export const OrderStatusSchema = z.enum([
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
]);
export type OrderStatus = z.infer<typeof OrderStatusSchema>;

export const PaymentStatusSchema = z.enum(['PENDING', 'PAID', 'FAILED']);
export type PaymentStatus = z.infer<typeof PaymentStatusSchema>;
