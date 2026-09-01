import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { Product } from '@plastimatic/shared';
import { ProductCard } from './product-card';
import { api } from '@/lib/api-client';

vi.mock('@/lib/api-client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api-client')>('@/lib/api-client');
  return { ...actual, api: { ...actual.api, post: vi.fn() } };
});

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'prod-1',
    name: 'Casque de chantier ProShield',
    slug: 'casque-de-chantier-proshield',
    description: null,
    images: [],
    isActive: true,
    categoryId: 'cat-1',
    category: { id: 'cat-1', name: 'Équipements de sécurité', slug: 'equipements' },
    createdAt: new Date('2020-01-01'),
    variants: [
      { id: 'v1', productId: 'prod-1', sku: 'SKU-1', size: 'Unique', color: 'Jaune', price: 18.05, costPrice: 10, quantity: 89, lowStockThreshold: 5 },
    ],
    ...overrides,
  };
}

function renderCard(product: Product) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ProductCard product={product} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ProductCard', () => {
  beforeEach(() => {
    vi.mocked(api.post).mockReset();
  });

  it('shows the lowest variant price and the product name', () => {
    renderCard(makeProduct());
    expect(screen.getByText('Casque de chantier ProShield')).toBeInTheDocument();
    expect(screen.getByText(/18,05/)).toBeInTheDocument();
  });

  it('shows an out-of-stock badge when every variant has zero quantity', () => {
    renderCard(makeProduct({ variants: [{ id: 'v1', productId: 'prod-1', sku: 'SKU-1', size: 'Unique', color: 'Jaune', price: 18.05, costPrice: 10, quantity: 0, lowStockThreshold: 5 }] }));
    expect(screen.getByText('Rupture de stock')).toBeInTheDocument();
    // Out of stock -> no quick-add button, even for a single variant.
    expect(screen.queryByLabelText('Ajouter au panier')).not.toBeInTheDocument();
  });

  it('shows a quick-add button only when there is exactly one variant in stock', () => {
    renderCard(makeProduct());
    expect(screen.getByLabelText('Ajouter au panier')).toBeInTheDocument();
  });

  it('hides the quick-add button when the product has multiple variants', () => {
    const twoVariants = [
      { id: 'v1', productId: 'prod-1', sku: 'SKU-1', size: '40', color: 'Noir', price: 50, costPrice: 30, quantity: 5, lowStockThreshold: 5 },
      { id: 'v2', productId: 'prod-1', sku: 'SKU-2', size: '41', color: 'Noir', price: 55, costPrice: 30, quantity: 5, lowStockThreshold: 5 },
    ];
    renderCard(makeProduct({ variants: twoVariants }));
    expect(screen.queryByLabelText('Ajouter au panier')).not.toBeInTheDocument();
  });

  it('adds the single variant to the cart on quick-add click, without navigating', async () => {
    const user = userEvent.setup();
    vi.mocked(api.post).mockResolvedValue({ id: 'cart-1', items: [], subtotal: 0, totalItems: 1 });
    renderCard(makeProduct());

    await user.click(screen.getByLabelText('Ajouter au panier'));

    expect(api.post).toHaveBeenCalledWith('/cart/items', { variantId: 'v1', quantity: 1 });
  });
});
