import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { AddCartItemInput, CartResponse } from '@plastimatic/shared';
import { PrismaService } from '../prisma/prisma.service';
import { toNumber } from '../common/decimal';

export interface CartIdentity {
  userId?: string;
  sessionToken?: string;
}

const cartInclude = {
  items: { include: { variant: { include: { product: true } } } },
} as const;

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  private async getOrCreateCart(identity: CartIdentity) {
    const where = identity.userId ? { userId: identity.userId } : { sessionToken: identity.sessionToken };
    const existing = await this.prisma.cart.findFirst({ where, include: cartInclude });
    if (existing) return existing;

    return this.prisma.cart.create({
      data: identity.userId ? { userId: identity.userId } : { sessionToken: identity.sessionToken },
      include: cartInclude,
    });
  }

  async getCart(identity: CartIdentity): Promise<CartResponse> {
    const cart = await this.getOrCreateCart(identity);
    return this.serialize(cart);
  }

  async addItem(identity: CartIdentity, input: AddCartItemInput): Promise<CartResponse> {
    const variant = await this.prisma.productVariant.findUnique({ where: { id: input.variantId } });
    if (!variant) {
      throw new NotFoundException('Product variant not found');
    }

    const cart = await this.getOrCreateCart(identity);
    const existingItem = cart.items.find((item) => item.variantId === input.variantId);
    const nextQuantity = (existingItem?.quantity ?? 0) + input.quantity;

    if (nextQuantity > variant.quantity) {
      throw new BadRequestException(`Only ${variant.quantity} unit(s) available for this item`);
    }

    await this.prisma.cartItem.upsert({
      where: { cartId_variantId: { cartId: cart.id, variantId: input.variantId } },
      create: { cartId: cart.id, variantId: input.variantId, quantity: input.quantity },
      update: { quantity: nextQuantity },
    });

    return this.getCart(identity);
  }

  async updateItem(identity: CartIdentity, itemId: string, quantity: number): Promise<CartResponse> {
    const cart = await this.getOrCreateCart(identity);
    const item = cart.items.find((i) => i.id === itemId);
    if (!item) {
      throw new NotFoundException('Cart item not found');
    }
    if (quantity > item.variant.quantity) {
      throw new BadRequestException(`Only ${item.variant.quantity} unit(s) available for this item`);
    }

    await this.prisma.cartItem.update({ where: { id: itemId }, data: { quantity } });
    return this.getCart(identity);
  }

  async removeItem(identity: CartIdentity, itemId: string): Promise<CartResponse> {
    const cart = await this.getOrCreateCart(identity);
    const item = cart.items.find((i) => i.id === itemId);
    if (!item) {
      throw new NotFoundException('Cart item not found');
    }
    await this.prisma.cartItem.delete({ where: { id: itemId } });
    return this.getCart(identity);
  }

  /**
   * Called by the shop right after a guest logs in: folds the guest cart
   * (identified by the session cookie) into the now-known user's cart,
   * summing quantities for shared items, then discards the guest cart.
   */
  async mergeGuestCartIntoUser(sessionToken: string, userId: string): Promise<CartResponse> {
    return this.prisma.$transaction(async (tx) => {
      const guestCart = await tx.cart.findUnique({
        where: { sessionToken },
        include: cartInclude,
      });

      const userCart =
        (await tx.cart.findUnique({ where: { userId }, include: cartInclude })) ??
        (await tx.cart.create({ data: { userId }, include: cartInclude }));

      if (guestCart) {
        for (const item of guestCart.items) {
          const existing = userCart.items.find((i) => i.variantId === item.variantId);
          const quantity = Math.min(
            (existing?.quantity ?? 0) + item.quantity,
            item.variant.quantity,
          );
          await tx.cartItem.upsert({
            where: { cartId_variantId: { cartId: userCart.id, variantId: item.variantId } },
            create: { cartId: userCart.id, variantId: item.variantId, quantity },
            update: { quantity },
          });
        }
        await tx.cart.delete({ where: { id: guestCart.id } });
      }

      const finalCart = await tx.cart.findUniqueOrThrow({ where: { id: userCart.id }, include: cartInclude });
      return this.serialize(finalCart);
    });
  }

  private serialize(cart: Awaited<ReturnType<CartService['getOrCreateCart']>>): CartResponse {
    const items = cart.items.map((item) => {
      const unitPrice = toNumber(item.variant.price);
      return {
        id: item.id,
        variantId: item.variantId,
        productName: item.variant.product.name,
        productSlug: item.variant.product.slug,
        image: item.variant.product.images[0] ?? null,
        size: item.variant.size,
        color: item.variant.color,
        unitPrice,
        quantity: item.quantity,
        lineTotal: Math.round(unitPrice * item.quantity * 100) / 100,
        availableQuantity: item.variant.quantity,
      };
    });

    return {
      id: cart.id,
      items,
      subtotal: Math.round(items.reduce((sum, i) => sum + i.lineTotal, 0) * 100) / 100,
      totalItems: items.reduce((sum, i) => sum + i.quantity, 0),
    };
  }
}
