import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useCategories, useProducts } from '../api/catalog-api';
import { ProductCard } from '../components/product-card';
import { HeroIllustration } from '@/components/hero-illustration';

// Each page is now its own request to the API (real pagination — see
// catalog-api.ts), so this only needs to match the 4-column desktop grid
// into 3 even rows; it no longer caps how many products the catalog can
// hold.
const PAGE_SIZE = 12;

export function CatalogPage() {
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<string | undefined>(searchParams.get('category') ?? undefined);
  const [page, setPage] = useState(1);

  // Header/footer nav links carry `?category=<id>` — pick that up whenever
  // the URL changes (including a click while already on this page) so the
  // filter pills below stay in sync with how the user actually navigated in.
  useEffect(() => {
    setCategoryId(searchParams.get('category') ?? undefined);
  }, [searchParams]);

  // Any filter change invalidates the current page number — go back to 1
  // rather than risk landing on a page that no longer has any items.
  useEffect(() => {
    setPage(1);
  }, [search, categoryId]);

  const categories = useCategories();
  const products = useProducts({ search: search || undefined, categoryId, page, pageSize: PAGE_SIZE });

  const totalPages = products.data?.totalPages ?? 1;
  const pageItems = products.data?.items ?? [];

  return (
    <div>
      <section className="relative overflow-hidden bg-gradient-to-br from-primary to-primary-dark text-primary-foreground">
        <div className="container grid grid-cols-1 items-center gap-8 py-16 sm:py-24 lg:grid-cols-2">
          <div className="flex flex-col items-start gap-4">
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
              Fabriqué en Algérie
            </span>
            <h1 className="max-w-xl font-display text-4xl font-extrabold leading-tight sm:text-5xl">
              Équipements professionnels qui tiennent la distance
            </h1>
            <p className="max-w-lg text-primary-foreground/90">
              Vêtements de travail, équipements de sécurité et chaussures industrielles conçus pour le
              terrain.
            </p>
            <Button asChild size="lg" variant="secondary" className="mt-2 font-semibold">
              <a href="#products">Voir le catalogue</a>
            </Button>
          </div>
          <HeroIllustration className="hidden w-full max-w-md justify-self-center lg:block" />
        </div>
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-24 right-24 h-72 w-72 rounded-full bg-black/10" />
      </section>

      <div id="products" className="container py-10">
        <div className="mb-6 flex flex-col gap-4">
          <div className="relative sm:max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un produit…"
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCategoryId(undefined)}
              className={cn(
                'rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
                !categoryId
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background text-foreground hover:border-primary/50 hover:text-primary',
              )}
            >
              Tous
            </button>
            {categories.data?.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategoryId(c.id)}
                className={cn(
                  'rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
                  categoryId === c.id
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background text-foreground hover:border-primary/50 hover:text-primary',
                )}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {products.isLoading &&
            Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="aspect-[3/4] w-full" />)}
          {pageItems.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
          {!products.isLoading && pageItems.length === 0 && (
            <p className="col-span-full py-12 text-center text-muted-foreground">Aucun produit trouvé.</p>
          )}
        </div>

        {totalPages > 1 && (
          <div className="mt-10 flex items-center justify-center gap-1.5">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:border-primary/50 hover:text-primary disabled:pointer-events-none disabled:opacity-40"
              aria-label="Page précédente"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPage(p)}
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium transition-colors',
                  p === page ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-secondary',
                )}
              >
                {p}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:border-primary/50 hover:text-primary disabled:pointer-events-none disabled:opacity-40"
              aria-label="Page suivante"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
