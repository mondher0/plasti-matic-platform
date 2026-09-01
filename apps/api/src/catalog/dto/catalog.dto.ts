import { createZodDto } from 'nestjs-zod';
import {
  CreateCategorySchema,
  CreateProductSchema,
  CreateProductVariantSchema,
  ProductQuerySchema,
  UpdateProductSchema,
  UpdateProductVariantSchema,
} from '@plastimatic/shared';

export class CreateCategoryDto extends createZodDto(CreateCategorySchema) {}
export class CreateProductDto extends createZodDto(CreateProductSchema) {}
export class UpdateProductDto extends createZodDto(UpdateProductSchema) {}
export class ProductQueryDto extends createZodDto(ProductQuerySchema) {}
export class CreateProductVariantDto extends createZodDto(CreateProductVariantSchema) {}
export class UpdateProductVariantDto extends createZodDto(UpdateProductVariantSchema) {}
