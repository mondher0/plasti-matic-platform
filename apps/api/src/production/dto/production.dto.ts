import { createZodDto } from 'nestjs-zod';
import {
  CreateProductionBatchSchema,
  ProductionBatchQuerySchema,
  UpdateProductionBatchSchema,
} from '@plastimatic/shared';

export class CreateProductionBatchDto extends createZodDto(CreateProductionBatchSchema) {}
export class UpdateProductionBatchDto extends createZodDto(UpdateProductionBatchSchema) {}
export class ProductionBatchQueryDto extends createZodDto(ProductionBatchQuerySchema) {}
