import { BadRequestException, Body, Controller, Get, Headers, Param, Patch, Post, Query, RawBodyRequest, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { OrdersService } from './orders.service';
import { StripeService } from './stripe.service';
import { CheckoutDto, OrderQueryDto, UpdateOrderStatusDto } from './dto/orders.dto';

const CART_COOKIE = 'cart_session';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly stripeService: StripeService,
  ) {}

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Post('checkout')
  checkout(@Body() dto: CheckoutDto, @Req() req: Request) {
    const user = req.user as AuthenticatedUser | null;
    const identity = user ? { userId: user.id } : { sessionToken: req.cookies?.[CART_COOKIE] };
    return this.ordersService.checkout(identity, dto);
  }

  // Stripe posts here directly (not through the shop or dashboard) once a
  // Checkout Session's payment settles — signature-verified against the raw
  // request body (see main.ts's `rawBody: true`), never trust an
  // unauthenticated caller otherwise claiming "this order is paid".
  @Public()
  @Post('webhook/stripe')
  async stripeWebhook(@Req() req: RawBodyRequest<Request>, @Headers('stripe-signature') signature: string) {
    if (!req.rawBody || !signature) {
      throw new BadRequestException('Missing Stripe signature or raw body');
    }
    const event = this.stripeService.constructEvent(req.rawBody, signature);

    switch (event.type) {
      case 'checkout.session.completed': {
        const orderId = event.data.object.metadata?.orderId;
        if (orderId) await this.ordersService.confirmPayment(orderId);
        break;
      }
      case 'checkout.session.expired': {
        const orderId = event.data.object.metadata?.orderId;
        if (orderId) await this.ordersService.expireSession(orderId);
        break;
      }
    }
    return { received: true };
  }

  @ApiBearerAuth()
  @Get('mine')
  listMine(@CurrentUser() user: AuthenticatedUser) {
    return this.ordersService.listForUser(user.id);
  }

  @ApiBearerAuth()
  @Roles('ADMIN', 'STAFF')
  @Get()
  listAll(@Query() query: OrderQueryDto) {
    return this.ordersService.listAll(query);
  }

  // The order-confirmation page is reached right after a checkout that may
  // have been a guest checkout — there's no token to require here. Same
  // @Public() + OptionalJwtAuthGuard pattern as checkout() above: an absent
  // user is fine, ordersService.findOne only enforces ownership when a
  // CUSTOMER-role requester is actually present.
  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser | null) {
    return this.ordersService.findOne(id, user ?? undefined);
  }

  @ApiBearerAuth()
  @Roles('ADMIN', 'STAFF')
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.ordersService.updateStatus(id, dto.status);
  }
}
