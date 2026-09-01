import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CatalogService } from './catalog.service';
import {
  CreateCategoryDto,
  CreateProductDto,
  CreateProductVariantDto,
  ProductQueryDto,
  UpdateProductDto,
  UpdateProductVariantDto,
} from './dto/catalog.dto';

@ApiTags('catalog')
@Controller()
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  // Public read endpoints power both the dashboard and the storefront.
  @Public()
  @Get('categories')
  listCategories() {
    return this.catalogService.listCategories();
  }

  @ApiBearerAuth()
  @Roles('ADMIN', 'STAFF')
  @Post('categories')
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.catalogService.createCategory(dto);
  }

  @Public()
  @Get('products')
  listProducts(@Query() query: ProductQueryDto) {
    return this.catalogService.listProducts(query);
  }

  @Public()
  @Get('products/slug/:slug')
  findBySlug(@Param('slug') slug: string) {
    return this.catalogService.findBySlug(slug);
  }

  @Public()
  @Get('products/:id')
  findOne(@Param('id') id: string) {
    return this.catalogService.findOne(id);
  }

  @ApiBearerAuth()
  @Roles('ADMIN', 'STAFF')
  @Post('products')
  create(@Body() dto: CreateProductDto) {
    return this.catalogService.create(dto);
  }

  @ApiBearerAuth()
  @Roles('ADMIN', 'STAFF')
  @Patch('products/:id')
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.catalogService.update(id, dto);
  }

  @ApiBearerAuth()
  @Roles('ADMIN')
  @Delete('products/:id')
  remove(@Param('id') id: string) {
    return this.catalogService.remove(id);
  }

  @ApiBearerAuth()
  @Roles('ADMIN', 'STAFF')
  @Post('products/:id/variants')
  addVariant(@Param('id') id: string, @Body() dto: CreateProductVariantDto) {
    return this.catalogService.addVariant(id, dto);
  }

  @ApiBearerAuth()
  @Roles('ADMIN', 'STAFF')
  @Patch('products/:id/variants/:variantId')
  updateVariant(
    @Param('id') id: string,
    @Param('variantId') variantId: string,
    @Body() dto: UpdateProductVariantDto,
  ) {
    return this.catalogService.updateVariant(id, variantId, dto);
  }
}
