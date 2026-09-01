import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  Category,
  CreateCategoryInput,
  CreateProductInput,
  CreateProductVariantInput,
  PaginatedResponse,
  Product,
  ProductQuery,
  UpdateProductInput,
  UpdateProductVariantInput,
} from '@plastimatic/shared';
import { PrismaService } from '../prisma/prisma.service';
import { toNumber } from '../common/decimal';
import { toPaginatedResponse, toSkipTake } from '../common/pagination';

type ProductWithRelations = Awaited<ReturnType<CatalogService['findOneRaw']>>;

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  // ---- Categories ----

  listCategories(): Promise<Category[]> {
    return this.prisma.category.findMany({ orderBy: { name: 'asc' } });
  }

  createCategory(input: CreateCategoryInput): Promise<Category> {
    return this.prisma.category.create({ data: input });
  }

  // ---- Products ----

  async listProducts(query: ProductQuery): Promise<PaginatedResponse<Product>> {
    const where = {
      categoryId: query.categoryId,
      isActive: query.isActive,
      ...(query.search ? { name: { contains: query.search, mode: 'insensitive' as const } } : {}),
    };

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: { category: true, variants: true },
        orderBy: { createdAt: 'desc' },
        ...toSkipTake(query),
      }),
      this.prisma.product.count({ where }),
    ]);

    return toPaginatedResponse(products.map((p) => this.serializeProduct(p)), total, query);
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.findOneRaw(id);
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return this.serializeProduct(product);
  }

  async findBySlug(slug: string): Promise<Product> {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: { category: true, variants: true },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return this.serializeProduct(product);
  }

  private findOneRaw(id: string) {
    return this.prisma.product.findUnique({
      where: { id },
      include: { category: true, variants: true },
    });
  }

  async create(input: CreateProductInput): Promise<Product> {
    const category = await this.prisma.category.findUnique({ where: { id: input.categoryId } });
    if (!category) {
      throw new BadRequestException('Unknown categoryId');
    }

    // Creating a variant with a non-zero opening quantity must also record a
    // matching StockMovement, otherwise the ledger (used to reconstruct
    // point-in-time inventory value for the turnover KPI) would disagree
    // with ProductVariant.quantity from the very first day.
    const product = await this.prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          name: input.name,
          slug: input.slug,
          description: input.description,
          images: input.images,
          isActive: input.isActive,
          categoryId: input.categoryId,
          variants: { create: input.variants },
        },
        include: { category: true, variants: true },
      });

      for (const variant of created.variants) {
        if (variant.quantity > 0) {
          await tx.stockMovement.create({
            data: {
              variantId: variant.id,
              type: 'IN',
              quantity: variant.quantity,
              reason: 'Opening stock',
              reference: 'PRODUCT_CREATED',
            },
          });
        }
      }

      return created;
    });
    return this.serializeProduct(product);
  }

  async update(id: string, input: UpdateProductInput): Promise<Product> {
    await this.findOne(id);
    const product = await this.prisma.product.update({
      where: { id },
      data: input,
      include: { category: true, variants: true },
    });
    return this.serializeProduct(product);
  }

  /**
   * Adds a new variant to an existing product. Uses the same
   * create-with-opening-stock-movement pattern as `create()` so the ledger
   * stays consistent for this variant from day one too.
   */
  async addVariant(productId: string, input: CreateProductVariantInput): Promise<Product> {
    await this.findOne(productId);
    await this.prisma.$transaction(async (tx) => {
      const variant = await tx.productVariant.create({ data: { ...input, productId } });
      if (variant.quantity > 0) {
        await tx.stockMovement.create({
          data: {
            variantId: variant.id,
            type: 'IN',
            quantity: variant.quantity,
            reason: 'Opening stock',
            reference: 'VARIANT_ADDED',
          },
        });
      }
    });
    return this.findOne(productId);
  }

  /**
   * Edits a variant's descriptive/pricing fields only — never `quantity`,
   * which only ever moves through a StockMovement (see InventoryService).
   */
  async updateVariant(
    productId: string,
    variantId: string,
    input: UpdateProductVariantInput,
  ): Promise<Product> {
    const variant = await this.prisma.productVariant.findUnique({ where: { id: variantId } });
    if (!variant || variant.productId !== productId) {
      throw new NotFoundException('Product variant not found');
    }
    await this.prisma.productVariant.update({ where: { id: variantId }, data: input });
    return this.findOne(productId);
  }

  /**
   * Hard-deletes a product only if none of its variants have any
   * transactional history. Once a variant has a stock movement, an order
   * line, or a production batch against it, deleting it would either violate
   * a foreign key (Postgres correctly refuses this) or silently corrupt that
   * history — so instead we tell the caller to deactivate the product
   * (`isActive: false`, already exposed via PATCH) rather than delete it.
   */
  async remove(id: string): Promise<void> {
    const product = await this.findOneRaw(id);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const variantIds = product.variants.map((v) => v.id);
    const [movementCount, orderItemCount, productionBatchCount] = await Promise.all([
      this.prisma.stockMovement.count({ where: { variantId: { in: variantIds } } }),
      this.prisma.orderItem.count({ where: { variantId: { in: variantIds } } }),
      this.prisma.productionBatch.count({ where: { variantId: { in: variantIds } } }),
    ]);

    if (movementCount > 0 || orderItemCount > 0 || productionBatchCount > 0) {
      throw new BadRequestException(
        'This product has stock, order, or production history and cannot be deleted — deactivate it instead.',
      );
    }

    await this.prisma.product.delete({ where: { id } });
  }

  private serializeProduct(product: ProductWithRelations): Product {
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      images: product.images,
      isActive: product.isActive,
      categoryId: product.categoryId,
      createdAt: product.createdAt,
      category: product.category,
      variants: product.variants.map((v) => ({
        id: v.id,
        productId: v.productId,
        sku: v.sku,
        size: v.size,
        color: v.color,
        price: toNumber(v.price),
        costPrice: toNumber(v.costPrice),
        quantity: v.quantity,
        lowStockThreshold: v.lowStockThreshold,
      })),
    };
  }
}
