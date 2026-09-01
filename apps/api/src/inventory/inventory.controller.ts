import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { InventoryService } from './inventory.service';
import { CreateStockMovementDto, MovementQueryDto, StockVariantQueryDto } from './dto/inventory.dto';

@ApiBearerAuth()
@ApiTags('inventory')
@Roles('ADMIN', 'STAFF')
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('movements')
  listMovements(@Query() query: MovementQueryDto) {
    return this.inventoryService.listMovements(query);
  }

  @Post('movements')
  recordMovement(@Body() dto: CreateStockMovementDto, @CurrentUser() user: AuthenticatedUser) {
    return this.inventoryService.recordMovement(dto, user.id);
  }

  @Get('low-stock')
  lowStock() {
    return this.inventoryService.lowStock();
  }

  @Get('variants')
  listVariants(@Query() query: StockVariantQueryDto) {
    return this.inventoryService.listVariants(query);
  }
}
