import { createZodDto } from 'nestjs-zod';
import { CreateStockMovementSchema, MovementQuerySchema, StockVariantQuerySchema } from '@plastimatic/shared';

export class CreateStockMovementDto extends createZodDto(CreateStockMovementSchema) {}
export class MovementQueryDto extends createZodDto(MovementQuerySchema) {}
export class StockVariantQueryDto extends createZodDto(StockVariantQuerySchema) {}
