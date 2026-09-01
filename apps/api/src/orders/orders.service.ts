import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { CheckoutInput, CheckoutSessionResponse, Order, OrderQuery, OrderStatus, PaginatedResponse } from '@plastimatic/shared';
import { PrismaService } from '../prisma/prisma.service';
import { toNumber } from '../common/decimal';
import { toPaginatedResponse, toSkipTake } from '../common/pagination';
import type { CartIdentity } from '../cart/cart.service';
import { StripeService } from './stripe.service';

function generateOrderNumber(): string {
  const timePart = Date.now().toString(36).toUpperCase();
  const randomPart = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `ORD-${timePart}-${randomPart}`;
}

const orderInclude = {
  items: { include: { variant: { include: { product: true } } } },
  user: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
  address: true,
} as const;
type OrderWithItems = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

// `Cart` has no `address` relation (only `Order` does) — checkout() previously
// reused `orderInclude` for the `tx.cart.findFirst()` lookup below, which
// Prisma rejects outright ("Unknown field `address`"), a 500 on every
// checkout attempt. All checkout actually reads off the cart is its line
// items' variant/product data, so that's all this include needs.
const cartCheckoutInclude = {
  items: { include: { variant: { include: { product: true } } } },
} as const;

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeService,
  ) {}

  /**
   * Turns the caller's cart into a PENDING/unpaid Order and starts a real
   * Stripe Checkout Session for it. Stock is deliberately NOT touched here —
   * only `confirmPayment()` (driven by the `checkout.session.completed`
   * webhook, once Stripe actually confirms the charge) decrements it, so an
   * abandoned/failed payment never holds stock hostage. The cart is cleared
   * immediately though, same as a normal "proceed to payment" flow.
   */
  async checkout(identity: CartIdentity, input: CheckoutInput): Promise<CheckoutSessionResponse> {
    const order = await this.prisma.$transaction(async (tx) => {
      const cartWhere = identity.userId ? { userId: identity.userId } : { sessionToken: identity.sessionToken };
      const cart = await tx.cart.findFirst({ where: cartWhere, include: cartCheckoutInclude });

      if (!cart || cart.items.length === 0) {
        throw new BadRequestException('Cart is empty');
      }
      if (!identity.userId && !input.guestEmail) {
        throw new BadRequestException('guestEmail is required for guest checkout');
      }

      for (const item of cart.items) {
        if (item.quantity > item.variant.quantity) {
          throw new BadRequestException(
            `Not enough stock for ${item.variant.product.name} (${item.variant.size}/${item.variant.color})`,
          );
        }
      }

      const address = await tx.address.create({
        data: { ...input.address, userId: identity.userId },
      });

      const subtotal = cart.items.reduce(
        (sum, item) => sum + toNumber(item.variant.price) * item.quantity,
        0,
      );

      const created = await tx.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          userId: identity.userId,
          guestEmail: identity.userId ? undefined : input.guestEmail,
          addressId: address.id,
          status: 'PENDING',
          paymentStatus: 'PENDING',
          subtotal,
          total: subtotal,
          items: {
            create: cart.items.map((item) => ({
              variantId: item.variantId,
              quantity: item.quantity,
              unitPrice: item.variant.price,
              lineTotal: toNumber(item.variant.price) * item.quantity,
            })),
          },
        },
        include: orderInclude,
      });

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      return created;
    });

    const session = await this.stripe.createCheckoutSession(
      order.id,
      order.items.map((item) => ({
        name: `${item.variant.product.name} (${item.variant.size}/${item.variant.color})`,
        unitPrice: toNumber(item.unitPrice),
        quantity: item.quantity,
      })),
    );

    if (!session.url) {
      throw new BadRequestException('Failed to create Stripe checkout session');
    }
    return { checkoutUrl: session.url };
  }

  /**
   * Invoked by the `checkout.session.completed` webhook once Stripe confirms
   * the charge actually succeeded — this is the moment stock is decremented
   * and a StockMovement is logged, not checkout() above. Stripe redelivers
   * webhooks (at-least-once), so this must tolerate being called twice for
   * the same order: gated on the order still being PENDING, a repeat call
   * is a no-op.
   */
  async confirmPayment(orderId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });
      if (!order || order.paymentStatus !== 'PENDING') {
        return;
      }

      for (const item of order.items) {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { quantity: { decrement: item.quantity } },
        });
        await tx.stockMovement.create({
          data: {
            variantId: item.variantId,
            type: 'OUT',
            quantity: item.quantity,
            reason: 'Order placed',
            reference: order.orderNumber,
          },
        });
      }

      await tx.order.update({
        where: { id: orderId },
        data: { paymentStatus: 'PAID', confirmedAt: new Date() },
      });
    });
  }

  /** `checkout.session.expired` — the customer never paid. Stock was never
   *  touched for a PENDING order, so there's nothing to restore. */
  async expireSession(orderId: string): Promise<void> {
    await this.prisma.order.updateMany({
      where: { id: orderId, paymentStatus: 'PENDING' },
      data: { paymentStatus: 'FAILED' },
    });
  }

  async listAll(query: OrderQuery): Promise<PaginatedResponse<Order>> {
    const where: Prisma.OrderWhereInput = {
      status: query.status,
      paymentStatus: query.paymentStatus,
      // Matches the order number itself, or the customer's name/email — the
      // linked account's if there is one, otherwise the guest email captured
      // at checkout (an order only ever has one or the other, never both).
      ...(query.search
        ? {
            OR: [
              { orderNumber: { contains: query.search, mode: 'insensitive' as const } },
              { guestEmail: { contains: query.search, mode: 'insensitive' as const } },
              {
                user: {
                  OR: [
                    { firstName: { contains: query.search, mode: 'insensitive' as const } },
                    { lastName: { contains: query.search, mode: 'insensitive' as const } },
                    { email: { contains: query.search, mode: 'insensitive' as const } },
                  ],
                },
              },
            ],
          }
        : {}),
    };
    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({ where, include: orderInclude, orderBy: { createdAt: 'desc' }, ...toSkipTake(query) }),
      this.prisma.order.count({ where }),
    ]);
    return toPaginatedResponse(orders.map((o) => this.serialize(o)), total, query);
  }

  async listForUser(userId: string): Promise<Order[]> {
    const orders = await this.prisma.order.findMany({
      where: { userId },
      include: orderInclude,
      orderBy: { createdAt: 'desc' },
    });
    return orders.map((o) => this.serialize(o));
  }

  async findOne(id: string, requester?: { id: string; role: string }): Promise<Order> {
    const order = await this.prisma.order.findUnique({ where: { id }, include: orderInclude });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (requester && requester.role === 'CUSTOMER' && order.userId !== requester.id) {
      throw new ForbiddenException('This order does not belong to you');
    }
    return this.serialize(order);
  }

  async updateStatus(id: string, status: OrderStatus): Promise<Order> {
    const timestampField =
      status === 'CONFIRMED' ? 'confirmedAt' : status === 'SHIPPED' ? 'shippedAt' : status === 'DELIVERED' ? 'deliveredAt' : null;

    const order = await this.prisma.order.update({
      where: { id },
      data: {
        status,
        ...(timestampField ? { [timestampField]: new Date() } : {}),
      },
      include: orderInclude,
    });
    return this.serialize(order);
  }

  private serialize(order: OrderWithItems): Order {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      subtotal: toNumber(order.subtotal),
      total: toNumber(order.total),
      createdAt: order.createdAt,
      confirmedAt: order.confirmedAt,
      shippedAt: order.shippedAt,
      deliveredAt: order.deliveredAt,
      customer: order.user,
      guestEmail: order.guestEmail,
      address: order.address,
      items: order.items.map((item) => ({
        id: item.id,
        variantId: item.variantId,
        productName: item.variant.product.name,
        sku: item.variant.sku,
        size: item.variant.size,
        color: item.variant.color,
        quantity: item.quantity,
        unitPrice: toNumber(item.unitPrice),
        lineTotal: toNumber(item.lineTotal),
      })),
    };
  }
}
