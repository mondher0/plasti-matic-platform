/**
 * Seeds realistic demo data for Plasti Matic: catalog, users, production
 * history and order history spread over the last ~90 days — so the
 * analytics/KPI module has real trends, an ABC split, low-stock items and
 * a couple of at-risk SKUs to show, instead of an empty dashboard.
 *
 * Run with: npm run prisma:seed --workspace=apps/api
 */
import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
faker.seed(42);

const DAY_MS = 24 * 60 * 60 * 1000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY_MS);

function randomInt(min: number, max: number): number {
  return faker.number.int({ min, max });
}

function pick<T>(arr: readonly T[]): T {
  return faker.helpers.arrayElement(arr);
}

// ---------------------------------------------------------------------------
// Catalog definition — Plasti Matic manufactures workwear, safety equipment
// and industrial safety shoes.
// ---------------------------------------------------------------------------

const CLOTHING_SIZES = ['S', 'M', 'L', 'XL', 'XXL'];
const CLOTHING_COLORS = ['Bleu marine', 'Gris', 'Orange', 'Noir'];
const GLOVE_SIZES = ['S', 'M', 'L', 'XL'];
const SHOE_SIZES = ['39', '40', '41', '42', '43', '44', '45', '46'];
const SHOE_COLORS = ['Noir', 'Marron'];

interface ProductSeed {
  name: string;
  description: string;
  sizes: string[];
  colors: string[];
  priceRange: [number, number];
  costRatio: number; // costPrice = price * costRatio
}

const CATALOG: Record<string, { slug: string; products: ProductSeed[] }> = {
  'Vêtements de travail': {
    slug: 'vetements-de-travail',
    products: [
      {
        name: 'Combinaison de travail Basalte',
        description: "Combinaison une pièce en coton renforcé, résistante à l'abrasion.",
        sizes: CLOTHING_SIZES,
        colors: CLOTHING_COLORS,
        priceRange: [45, 65],
        costRatio: 0.55,
      },
      {
        name: 'Veste haute visibilité Aurora',
        description: 'Veste normée EN ISO 20471 avec bandes rétroréfléchissantes.',
        sizes: CLOTHING_SIZES,
        colors: ['Orange', 'Jaune'],
        priceRange: [38, 55],
        costRatio: 0.5,
      },
      {
        name: 'Pantalon de travail Renfort',
        description: 'Pantalon multipoches avec genouillères renforcées.',
        sizes: CLOTHING_SIZES,
        colors: CLOTHING_COLORS,
        priceRange: [30, 48],
        costRatio: 0.55,
      },
      {
        name: 'Blouson multipoches Atlas',
        description: 'Blouson matelassé pour travail en extérieur, doublure amovible.',
        sizes: CLOTHING_SIZES,
        colors: CLOTHING_COLORS,
        priceRange: [50, 75],
        costRatio: 0.52,
      },
    ],
  },
  'Équipements de sécurité': {
    slug: 'equipements-de-securite',
    products: [
      {
        name: 'Casque de chantier ProShield',
        description: 'Casque de protection EN 397 avec système de ventilation.',
        sizes: ['Unique'],
        colors: ['Blanc', 'Jaune', 'Orange'],
        priceRange: [12, 20],
        costRatio: 0.45,
      },
      {
        name: 'Gants anti-coupure NitriGrip',
        description: 'Gants enduits nitrile, niveau de coupure C, bonne préhension.',
        sizes: GLOVE_SIZES,
        colors: ['Gris'],
        priceRange: [6, 11],
        costRatio: 0.4,
      },
      {
        name: 'Lunettes de protection ClearVue',
        description: 'Lunettes anti-rayures et anti-buée, protection UV.',
        sizes: ['Unique'],
        colors: ['Blanc'],
        priceRange: [5, 9],
        costRatio: 0.4,
      },
      {
        name: 'Gilet réfléchissant SignalPlus',
        description: 'Gilet de signalisation haute visibilité, fermeture velcro.',
        sizes: ['S', 'M', 'L', 'XL'],
        colors: ['Jaune', 'Orange'],
        priceRange: [4, 8],
        costRatio: 0.4,
      },
    ],
  },
  'Chaussures de sécurité': {
    slug: 'chaussures-de-securite',
    products: [
      {
        name: 'Chaussure basse Trekker S3',
        description: 'Chaussure de sécurité basse S3, embout composite, semelle anti-perforation.',
        sizes: SHOE_SIZES,
        colors: SHOE_COLORS,
        priceRange: [55, 80],
        costRatio: 0.58,
      },
      {
        name: 'Bottine montante Fortis S1P',
        description: 'Bottine montante S1P, confort renforcé pour usage intensif.',
        sizes: SHOE_SIZES,
        colors: SHOE_COLORS,
        priceRange: [60, 85],
        costRatio: 0.58,
      },
      {
        name: 'Sabot de sécurité ComfortStep',
        description: 'Sabot léger pour environnement humide, embout de protection.',
        sizes: SHOE_SIZES,
        colors: ['Noir'],
        priceRange: [35, 50],
        costRatio: 0.5,
      },
    ],
  },
};

async function resetDatabase() {
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.address.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.productionBatch.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();
}

async function seedUsers() {
  const passwordHash = await bcrypt.hash('password123', 10);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@plastimatic.dz',
      passwordHash,
      role: 'ADMIN',
      firstName: 'Halime',
      lastName: 'Guissous',
    },
  });

  await prisma.user.create({
    data: {
      email: 'staff@plastimatic.dz',
      passwordHash,
      role: 'STAFF',
      firstName: 'Mahdi',
      lastName: 'Guissous',
    },
  });

  const customers = await Promise.all(
    Array.from({ length: 6 }).map((_, i) =>
      prisma.user.create({
        data: {
          email: `client${i + 1}@example.com`,
          passwordHash,
          role: 'CUSTOMER',
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
        },
      }),
    ),
  );

  console.log(`Seeded ${customers.length + 2} users (admin@plastimatic.dz / password123, staff@plastimatic.dz / password123)`);
  return { admin, customers };
}

async function seedCatalog() {
  const variantIds: { id: string; price: number; productId: string }[] = [];

  for (const [categoryName, { slug, products }] of Object.entries(CATALOG)) {
    const category = await prisma.category.create({ data: { name: categoryName, slug } });

    for (const p of products) {
      const productSlug = `${slug}-${p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`;
      const product = await prisma.product.create({
        data: {
          name: p.name,
          slug: productSlug,
          description: p.description,
          images: [],
          isActive: true,
          categoryId: category.id,
        },
      });

      // Not every size/color combo — pick a realistic subset so we get variety
      // without an explosion of SKUs.
      const combos = faker.helpers.arrayElements(
        p.sizes.flatMap((size) => p.colors.map((color) => ({ size, color }))),
        { min: Math.min(4, p.sizes.length), max: Math.min(8, p.sizes.length * p.colors.length) },
      );

      for (const { size, color } of combos) {
        const price = randomInt(p.priceRange[0] * 100, p.priceRange[1] * 100) / 100;
        const costPrice = Math.round(price * p.costRatio * 100) / 100;
        const variant = await prisma.productVariant.create({
          data: {
            productId: product.id,
            sku: `${productSlug}-${size}-${color}`.toUpperCase().replace(/\s+/g, ''),
            size,
            color,
            price,
            costPrice,
            quantity: 0,
            lowStockThreshold: randomInt(8, 15),
          },
        });
        variantIds.push({ id: variant.id, price, productId: product.id });
      }
    }
  }

  console.log(`Seeded ${Object.keys(CATALOG).length} categories, ${variantIds.length} SKUs`);
  return variantIds;
}

/** Production is the only source of stock in this domain — completed batches push units in. */
async function seedProduction(variants: { id: string }[]) {
  for (const variant of variants) {
    const batchCount = randomInt(2, 4);
    for (let i = 0; i < batchCount; i++) {
      const startDate = daysAgo(randomInt(15, 75));
      const plannedQty = randomInt(60, 220);
      const isLast = i === batchCount - 1;
      // Keep the very last batch for a couple of variants in-flight so the
      // production pipeline isn't 100% COMPLETED (more realistic dashboard).
      const status = isLast && Math.random() < 0.15 ? 'IN_PROGRESS' : 'COMPLETED';

      const defectQty = status === 'COMPLETED' ? Math.round(plannedQty * faker.number.float({ min: 0, max: 0.06 })) : 0;
      const producedQty =
        status === 'COMPLETED' ? plannedQty - Math.round(plannedQty * faker.number.float({ min: 0, max: 0.03 })) : 0;

      const batch = await prisma.productionBatch.create({
        data: {
          batchNumber: `BATCH-${variant.id.toUpperCase()}-${i}`,
          variantId: variant.id,
          plannedQty,
          producedQty,
          defectQty,
          startDate,
          endDate: status === 'COMPLETED' ? new Date(startDate.getTime() + randomInt(3, 10) * DAY_MS) : null,
          status,
        },
      });

      if (status === 'COMPLETED' && producedQty > 0) {
        await prisma.productVariant.update({
          where: { id: variant.id },
          data: { quantity: { increment: producedQty } },
        });
        await prisma.stockMovement.create({
          data: {
            variantId: variant.id,
            type: 'IN',
            quantity: producedQty,
            reason: 'Production batch completed',
            reference: batch.batchNumber,
            createdAt: batch.endDate ?? startDate,
          },
        });
      }
    }
  }
  console.log('Seeded production batches (and matching stock IN movements)');
}

async function seedOrders(
  variants: { id: string; price: number; productId: string }[],
  customers: { id: string }[],
) {
  const ORDER_COUNT = 140;
  const statusesByAge = (ageDays: number) => {
    if (ageDays < 2) return pick(['PENDING', 'CONFIRMED'] as const);
    if (ageDays < 5) return pick(['CONFIRMED', 'PROCESSING'] as const);
    if (ageDays < 8) return pick(['PROCESSING', 'SHIPPED'] as const);
    // Older orders have mostly completed their lifecycle.
    return pick(['DELIVERED', 'DELIVERED', 'DELIVERED', 'SHIPPED', 'CANCELLED'] as const);
  };

  let created = 0;
  for (let i = 0; i < ORDER_COUNT; i++) {
    const ageDays = Math.floor(faker.number.float({ min: 0, max: 85 }));
    const createdAt = daysAgo(ageDays);
    const status = statusesByAge(ageDays);
    const isCancelled = status === 'CANCELLED';
    const isGuest = Math.random() < 0.3;
    const customer = isGuest ? null : pick(customers);

    // Pick 1-3 variants with enough stock left; skip ones already depleted.
    const candidates = faker.helpers.shuffle([...variants]);
    const lines: { variantId: string; quantity: number; unitPrice: number }[] = [];
    for (const candidate of candidates) {
      if (lines.length >= randomInt(1, 3)) break;
      const currentVariant = await prisma.productVariant.findUnique({ where: { id: candidate.id } });
      if (!currentVariant || currentVariant.quantity < 2) continue;
      const quantity = randomInt(1, Math.min(4, currentVariant.quantity));
      lines.push({ variantId: candidate.id, quantity, unitPrice: candidate.price });
    }
    if (lines.length === 0) continue;

    const subtotal = Math.round(lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0) * 100) / 100;

    const address = await prisma.address.create({
      data: {
        userId: customer?.id,
        fullName: faker.person.fullName(),
        phone: faker.phone.number(),
        line1: faker.location.streetAddress(),
        city: faker.location.city(),
        postalCode: faker.location.zipCode(),
        country: 'Algérie',
      },
    });

    const confirmedAt = ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'].includes(status)
      ? new Date(createdAt.getTime() + randomInt(1, 6) * 60 * 60 * 1000)
      : null;
    const shippedAt = ['SHIPPED', 'DELIVERED'].includes(status)
      ? new Date((confirmedAt ?? createdAt).getTime() + randomInt(12, 48) * 60 * 60 * 1000)
      : null;
    const deliveredAt =
      status === 'DELIVERED'
        ? new Date((shippedAt ?? createdAt).getTime() + randomInt(24, 96) * 60 * 60 * 1000)
        : null;

    const order = await prisma.order.create({
      data: {
        orderNumber: `ORD-${createdAt.getTime().toString(36).toUpperCase()}-${i}`,
        userId: customer?.id,
        guestEmail: customer ? null : faker.internet.email(),
        addressId: address.id,
        status,
        paymentStatus: isCancelled ? pick(['FAILED', 'PENDING'] as const) : 'PAID',
        subtotal,
        total: subtotal,
        createdAt,
        confirmedAt,
        shippedAt,
        deliveredAt,
        items: { create: lines.map((l) => ({ ...l, lineTotal: Math.round(l.unitPrice * l.quantity * 100) / 100 })) },
      },
    });

    if (!isCancelled) {
      for (const line of lines) {
        await prisma.productVariant.update({
          where: { id: line.variantId },
          data: { quantity: { decrement: line.quantity } },
        });
        await prisma.stockMovement.create({
          data: {
            variantId: line.variantId,
            type: 'OUT',
            quantity: line.quantity,
            reason: 'Order placed',
            reference: order.orderNumber,
            createdAt,
          },
        });
      }
    }
    created++;
  }

  console.log(`Seeded ${created} orders spread over the last ~85 days`);
}

/** A few ADJUSTMENT movements (recounts, damage) so the ledger looks operationally realistic. */
async function seedAdjustments(variants: { id: string }[]) {
  const sample = faker.helpers.arrayElements(variants, 6);
  for (const variant of sample) {
    const current = await prisma.productVariant.findUnique({ where: { id: variant.id } });
    if (!current) continue;
    const isLoss = Math.random() < 0.6;
    const quantity = randomInt(1, 5);

    if (isLoss && current.quantity >= quantity) {
      await prisma.productVariant.update({ where: { id: variant.id }, data: { quantity: { decrement: quantity } } });
      await prisma.stockMovement.create({
        data: { variantId: variant.id, type: 'OUT', quantity, reason: 'Produit endommagé', reference: 'ADJ' },
      });
    } else {
      await prisma.productVariant.update({ where: { id: variant.id }, data: { quantity: { increment: quantity } } });
      await prisma.stockMovement.create({
        data: { variantId: variant.id, type: 'ADJUSTMENT', quantity, reason: 'Recomptage inventaire', reference: 'ADJ' },
      });
    }
  }
  console.log('Seeded a handful of stock adjustments');
}

async function main() {
  console.log('Resetting database...');
  await resetDatabase();

  const { customers } = await seedUsers();
  const variants = await seedCatalog();
  await seedProduction(variants);
  await seedOrders(variants, customers);
  await seedAdjustments(variants);

  console.log('Seed complete.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
