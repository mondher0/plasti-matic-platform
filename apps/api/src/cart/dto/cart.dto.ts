import { createZodDto } from 'nestjs-zod';
import { AddCartItemSchema, UpdateCartItemSchema } from '@plastimatic/shared';

export class AddCartItemDto extends createZodDto(AddCartItemSchema) {}
export class UpdateCartItemDto extends createZodDto(UpdateCartItemSchema) {}
