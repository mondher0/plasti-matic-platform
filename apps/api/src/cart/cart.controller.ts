import { Body, Controller, Delete, Get, Param, Patch, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { Public } from '../common/decorators/public.decorator';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { CartService, type CartIdentity } from './cart.service';
import { AddCartItemDto, UpdateCartItemDto } from './dto/cart.dto';

const CART_COOKIE = 'cart_session';
const CART_COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

@ApiTags('cart')
@Public()
@UseGuards(OptionalJwtAuthGuard)
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  getCart(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.cartService.getCart(this.resolveIdentity(req, res));
  }

  @Post('items')
  addItem(
    @Body() dto: AddCartItemDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.cartService.addItem(this.resolveIdentity(req, res), dto);
  }

  @Patch('items/:itemId')
  updateItem(
    @Param('itemId') itemId: string,
    @Body() dto: UpdateCartItemDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.cartService.updateItem(this.resolveIdentity(req, res), itemId, dto.quantity);
  }

  @Delete('items/:itemId')
  removeItem(
    @Param('itemId') itemId: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.cartService.removeItem(this.resolveIdentity(req, res), itemId);
  }

  /** Called by the shop right after login to fold the guest cart into the user's cart. */
  @Post('merge')
  merge(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const user = req.user as AuthenticatedUser | null;
    const sessionToken = req.cookies?.[CART_COOKIE];
    if (!user) {
      return this.cartService.getCart({});
    }
    if (!sessionToken) {
      return this.cartService.getCart({ userId: user.id });
    }
    res.clearCookie(CART_COOKIE);
    return this.cartService.mergeGuestCartIntoUser(sessionToken, user.id);
  }

  private resolveIdentity(req: Request, res: Response): CartIdentity {
    const user = req.user as AuthenticatedUser | null;
    if (user) {
      return { userId: user.id };
    }

    let sessionToken = req.cookies?.[CART_COOKIE];
    if (!sessionToken) {
      sessionToken = uuid();
      res.cookie(CART_COOKIE, sessionToken, {
        httpOnly: true,
        sameSite: 'lax',
        maxAge: CART_COOKIE_MAX_AGE_MS,
      });
    }
    return { sessionToken };
  }
}
