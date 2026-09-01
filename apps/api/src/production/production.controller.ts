import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { ProductionService } from './production.service';
import { CreateProductionBatchDto, ProductionBatchQueryDto, UpdateProductionBatchDto } from './dto/production.dto';

@ApiBearerAuth()
@ApiTags('production')
@Roles('ADMIN', 'STAFF')
@Controller('production/batches')
export class ProductionController {
  constructor(private readonly productionService: ProductionService) {}

  @Get()
  list(@Query() query: ProductionBatchQueryDto) {
    return this.productionService.listBatches(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productionService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateProductionBatchDto) {
    return this.productionService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProductionBatchDto) {
    return this.productionService.update(id, dto);
  }
}
