import { createZodDto } from 'nestjs-zod';
import { CheckoutSchema, OrderQuerySchema, UpdateOrderStatusSchema } from '@plastimatic/shared';

export class CheckoutDto extends createZodDto(CheckoutSchema) {}
export class UpdateOrderStatusDto extends createZodDto(UpdateOrderStatusSchema) {}
export class OrderQueryDto extends createZodDto(OrderQuerySchema) {}
