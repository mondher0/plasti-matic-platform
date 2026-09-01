import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type {
  CreateProductionBatchInput,
  PaginatedResponse,
  ProductionBatch,
  ProductionBatchQuery,
  UpdateProductionBatchInput,
} from '@plastimatic/shared';
import { PrismaService } from '../prisma/prisma.service';
import { toPaginatedResponse, toSkipTake } from '../common/pagination';

const batchInclude = {
  variant: { include: { product: { include: { category: true } } } },
} satisfies Prisma.ProductionBatchInclude;

type BatchWithVariant = Prisma.ProductionBatchGetPayload<{ include: typeof batchInclude }>;

@Injectable()
export class ProductionService {
  constructor(private readonly prisma: PrismaService) {}

  /** Flattens the variant/product/category join into the display fields the
   *  Production page actually needs — the same "joined once, used
   *  everywhere" shape as StockVariant in inventory.service.ts, so the page
   *  never has to re-derive a product's name from a bare variantId itself. */
  private serializeBatch(batch: BatchWithVariant): ProductionBatch {
    return {
      id: batch.id,
      batchNumber: batch.batchNumber,
      variantId: batch.variantId,
      productName: batch.variant.product.name,
      categoryName: batch.variant.product.category.name,
      sku: batch.variant.sku,
      size: batch.variant.size,
      color: batch.variant.color,
      plannedQty: batch.plannedQty,
      producedQty: batch.producedQty,
      defectQty: batch.defectQty,
      startDate: batch.startDate,
      endDate: batch.endDate,
      status: batch.status,
    };
  }

  async listBatches(query: ProductionBatchQuery): Promise<PaginatedResponse<ProductionBatch>> {
    const where: Prisma.ProductionBatchWhereInput = {
      status: query.status,
      ...(query.categoryId ? { variant: { product: { categoryId: query.categoryId } } } : {}),
      // A batch's own searchable text is just its number — finding one by
      // what it's actually producing means reaching through variant ->
      // product, same relation-crossing search as inventory's movements.
      ...(query.search
        ? {
            OR: [
              { batchNumber: { contains: query.search, mode: 'insensitive' as const } },
              { variant: { sku: { contains: query.search, mode: 'insensitive' as const } } },
              { variant: { product: { name: { contains: query.search, mode: 'insensitive' as const } } } },
            ],
          }
        : {}),
    };
    const [batches, total] = await Promise.all([
      this.prisma.productionBatch.findMany({
        where,
        include: batchInclude,
        orderBy: { startDate: 'desc' },
        ...toSkipTake(query),
      }),
      this.prisma.productionBatch.count({ where }),
    ]);
    return toPaginatedResponse(batches.map((b) => this.serializeBatch(b)), total, query);
  }

  async findOne(id: string): Promise<ProductionBatch> {
    const batch = await this.prisma.productionBatch.findUnique({ where: { id }, include: batchInclude });
    if (!batch) {
      throw new NotFoundException('Production batch not found');
    }
    return this.serializeBatch(batch);
  }

  async create(input: CreateProductionBatchInput): Promise<ProductionBatch> {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: input.variantId },
    });
    if (!variant) {
      throw new BadRequestException('Unknown variantId');
    }
    const created = await this.prisma.productionBatch.create({ data: input, include: batchInclude });
    return this.serializeBatch(created);
  }

  /**
   * Updates a batch. A batch only ever contributes to stock while it's
   * COMPLETED, for whatever `producedQty` it has at the time — so instead of
   * only reacting to the PLANNED/IN_PROGRESS -> COMPLETED transition (which
   * left editing `producedQty` *after* completion, or moving a batch back
   * out of COMPLETED, silently out of sync with stock), this compares what
   * was already reflected in stock against what should be reflected now,
   * and applies the difference. That covers the first completion (synced
   * goes from 0 to producedQty), correcting the produced count on an
   * already-completed batch (synced adjusts by the delta), and uncompleting
   * a batch (synced drops back to 0, reversing its contribution so a later
   * re-completion can't double-count it).
   */
  async update(id: string, input: UpdateProductionBatchInput): Promise<ProductionBatch> {
    return this.prisma.$transaction(async (tx) => {
      const batch = await tx.productionBatch.findUnique({ where: { id } });
      if (!batch) {
        throw new NotFoundException('Production batch not found');
      }

      const wasCompleted = batch.status === 'COMPLETED';
      const willBeCompleted = (input.status ?? batch.status) === 'COMPLETED';
      const producedQty = input.producedQty ?? batch.producedQty;

      const updated = await tx.productionBatch.update({
        where: { id },
        data: {
          producedQty: input.producedQty,
          defectQty: input.defectQty,
          status: input.status,
          endDate:
            input.endDate !== undefined ? input.endDate : willBeCompleted && !wasCompleted ? new Date() : undefined,
        },
        include: batchInclude,
      });

      const previouslySynced = wasCompleted ? batch.producedQty : 0;
      const nowSynced = willBeCompleted ? producedQty : 0;
      const delta = nowSynced - previouslySynced;

      if (delta !== 0) {
        const variant = await tx.productVariant.findUniqueOrThrow({
          where: { id: batch.variantId },
        });
        const nextQuantity = variant.quantity + delta;
        if (nextQuantity < 0) {
          throw new BadRequestException('This update would bring stock below zero');
        }
        await tx.productVariant.update({
          where: { id: batch.variantId },
          data: { quantity: nextQuantity },
        });
        await tx.stockMovement.create({
          data: {
            variantId: batch.variantId,
            type: delta > 0 ? 'IN' : 'OUT',
            quantity: Math.abs(delta),
            reason: delta > 0 ? 'Production batch completed' : 'Production batch quantity corrected',
            reference: batch.batchNumber,
          },
        });
      }

      return this.serializeBatch(updated);
    });
  }
}
