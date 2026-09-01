import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  CreateStockMovementInput,
  LowStockItem,
  MovementQuery,
  PaginatedResponse,
  StockMovement,
  StockVariant,
  StockVariantQuery,
} from '@plastimatic/shared';
import { PrismaService } from '../prisma/prisma.service';
import { toPaginatedResponse, toSkipTake } from '../common/pagination';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async listMovements(query: MovementQuery): Promise<PaginatedResponse<StockMovement>> {
    // A movement has no name of its own — "search" has to reach through the
    // variant it's on (SKU, product name) as well as matching its own reason
    // text, so a real filter here means a relation-crossing `where`, not a
    // client-side re-filter of whatever page happened to already be loaded.
    const where = {
      variantId: query.variantId,
      type: query.type,
      ...(query.search
        ? {
            OR: [
              { reason: { contains: query.search, mode: 'insensitive' as const } },
              { variant: { sku: { contains: query.search, mode: 'insensitive' as const } } },
              { variant: { product: { name: { contains: query.search, mode: 'insensitive' as const } } } },
            ],
          }
        : {}),
    };
    const [movements, total] = await Promise.all([
      this.prisma.stockMovement.findMany({ where, orderBy: { createdAt: 'desc' }, ...toSkipTake(query) }),
      this.prisma.stockMovement.count({ where }),
    ]);
    return toPaginatedResponse(movements, total, query);
  }

  /**
   * Flat, product-joined variant list for the Stock page's "Niveaux de
   * stock" panel — a dedicated endpoint (rather than reusing /products)
   * because that page lists SKUs directly, one row per variant, not
   * products-with-nested-variants, and needs its own independent pagination
   * for infinite scroll.
   *
   * The "Stock bas" / "OK" status filter compares two columns on the same
   * row (`quantity` vs. `lowStockThreshold`) — Prisma's query builder has no
   * way to express a column-to-column comparison in `where`, so this is
   * genuine raw SQL rather than a stylistic choice. Every filter value is
   * still passed as a bound parameter (via `Prisma.sql`'s tagged template),
   * never string-concatenated, so this is exactly as injection-safe as the
   * rest of the app's Prisma calls.
   */
  async listVariants(query: StockVariantQuery): Promise<PaginatedResponse<StockVariant>> {
    const { skip, take } = toSkipTake(query);

    const conditions: Prisma.Sql[] = [];
    if (query.search) {
      conditions.push(Prisma.sql`(p.name ILIKE ${'%' + query.search + '%'} OR v.sku ILIKE ${'%' + query.search + '%'})`);
    }
    if (query.categoryId) {
      conditions.push(Prisma.sql`p."categoryId" = ${query.categoryId}`);
    }
    if (query.status === 'LOW') {
      conditions.push(Prisma.sql`v.quantity <= v."lowStockThreshold"`);
    } else if (query.status === 'OK') {
      conditions.push(Prisma.sql`v.quantity > v."lowStockThreshold"`);
    }
    const where = conditions.length ? Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}` : Prisma.empty;

    const [items, totalResult] = await Promise.all([
      this.prisma.$queryRaw<StockVariant[]>`
        SELECT
          v.id, v."productId", p.name AS "productName", c.name AS "categoryName",
          v.sku, v.size, v.color, v.price::float8 AS price, v.quantity, v."lowStockThreshold"
        FROM "ProductVariant" v
        JOIN "Product" p ON p.id = v."productId"
        JOIN "Category" c ON c.id = p."categoryId"
        ${where}
        ORDER BY p.name ASC, v.size ASC, v.color ASC
        LIMIT ${take} OFFSET ${skip}
      `,
      this.prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*)::bigint AS count
        FROM "ProductVariant" v
        JOIN "Product" p ON p.id = v."productId"
        JOIN "Category" c ON c.id = p."categoryId"
        ${where}
      `,
    ]);

    return toPaginatedResponse(items, Number(totalResult[0].count), query);
  }

  /**
   * Records a movement and applies its effect to the variant's live quantity
   * in a single transaction, so the ledger (StockMovement) and the fast-read
   * balance (ProductVariant.quantity) never drift apart.
   */
  async recordMovement(
    input: CreateStockMovementInput,
    createdById?: string,
  ): Promise<StockMovement> {
    return this.prisma.$transaction(async (tx) => {
      const variant = await tx.productVariant.findUnique({ where: { id: input.variantId } });
      if (!variant) {
        throw new NotFoundException('Product variant not found');
      }

      // IN and ADJUSTMENT (e.g. a recount finding extra stock) increase the balance;
      // OUT (sales, damage, loss) decreases it. `quantity` is always stored positive.
      const delta = input.type === 'OUT' ? -input.quantity : input.quantity;
      const nextQuantity = variant.quantity + delta;
      if (nextQuantity < 0) {
        throw new BadRequestException('This movement would bring stock below zero');
      }

      await tx.productVariant.update({
        where: { id: input.variantId },
        data: { quantity: nextQuantity },
      });

      return tx.stockMovement.create({
        data: {
          variantId: input.variantId,
          type: input.type,
          quantity: input.quantity,
          reason: input.reason,
          reference: input.reference,
          createdById,
        },
      });
    });
  }

  async lowStock(): Promise<LowStockItem[]> {
    const variants = await this.prisma.productVariant.findMany({
      include: { product: true },
    });

    return variants
      .filter((v) => v.quantity <= v.lowStockThreshold)
      .map((v) => ({
        variantId: v.id,
        sku: v.sku,
        productName: v.product.name,
        size: v.size,
        color: v.color,
        quantity: v.quantity,
        lowStockThreshold: v.lowStockThreshold,
      }))
      .sort((a, b) => a.quantity - b.quantity);
  }
}
