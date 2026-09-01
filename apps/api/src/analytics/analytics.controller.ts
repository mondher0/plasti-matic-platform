import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { AnalyticsService } from './analytics.service';
import { DateRangeQueryDto } from './dto/analytics.dto';

@ApiBearerAuth()
@ApiTags('analytics')
@Roles('ADMIN', 'STAFF')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  // ---- Basic KPIs ----

  @Get('overview')
  overview(@Query() range: DateRangeQueryDto) {
    return this.analyticsService.getOverview(range);
  }

  @Get('orders-by-status')
  ordersByStatus() {
    return this.analyticsService.getOrderStatusBreakdown();
  }

  @Get('stock-by-category')
  stockByCategory() {
    return this.analyticsService.getStockByCategory();
  }

  @Get('revenue-trend')
  revenueTrend(@Query() range: DateRangeQueryDto) {
    return this.analyticsService.getRevenueTrend(range);
  }

  // ---- Advanced KPIs ----

  @Get('stock-turnover')
  stockTurnover(@Query() range: DateRangeQueryDto) {
    return this.analyticsService.getStockTurnover(range);
  }

  @Get('abc-analysis')
  abcAnalysis() {
    return this.analyticsService.getAbcAnalysis();
  }

  @Get('production-efficiency')
  productionEfficiency() {
    return this.analyticsService.getProductionEfficiency();
  }

  @Get('stockout-risk')
  stockoutRisk() {
    return this.analyticsService.getStockoutRisk();
  }

  @Get('sales-trend')
  salesTrend(@Query() range: DateRangeQueryDto) {
    return this.analyticsService.getSalesTrend(range);
  }

  @Get('top-products')
  topProducts() {
    return this.analyticsService.getTopProducts();
  }

  @Get('bottom-products')
  bottomProducts() {
    return this.analyticsService.getBottomProducts();
  }

  @Get('fulfillment-time')
  fulfillmentTime() {
    return this.analyticsService.getFulfillmentTime();
  }
}
