import { useCallback, useState } from 'react';
import { Loader2, Plus, Search } from 'lucide-react';
import type { StockMovementType, StockStatusFilter } from '@plastimatic/shared';
import { formatDate } from '@plastimatic/shared';
import { PageHeader } from '@/components/page-header';
import { StickyHeader } from '@/components/sticky-header';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useInfiniteScrollSentinel } from '@/hooks/use-infinite-scroll-sentinel';
import { TableSkeletonRows } from '@/components/table-skeleton';
import { useCategories, useProducts } from '@/features/catalog/api/catalog-api';
import { useInfiniteMovements, useInfiniteStockVariants } from '../api/inventory-api';
import { RecordMovementDialog } from '../components/record-movement-dialog';
import { VariantDetailDialog } from '../components/variant-detail-dialog';

const MOVEMENT_LABEL: Record<string, string> = { IN: 'Entrée', OUT: 'Sortie', ADJUSTMENT: 'Ajustement' };
const ALL = 'all';

/** Small footer row shown at the bottom of an infinite-scroll table: a
 *  spinner while the next page loads, otherwise nothing once exhausted. */
function InfiniteScrollFooter({ colSpan, isFetchingNextPage }: { colSpan: number; isFetchingNextPage: boolean }) {
  if (!isFetchingNextPage) return null;
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="py-3 text-center">
        <Loader2 className="mx-auto h-4 w-4 animate-spin text-muted-foreground" />
      </TableCell>
    </TableRow>
  );
}

export function InventoryPage() {
  // pageSize:100 here is just "give me enough products for the movement
  // dialog's variant picker" — unrelated to this page's own infinite lists.
  const products = useProducts({ page: 1, pageSize: 100 });
  const categories = useCategories();
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);

  // Every filter below is a real query param forwarded to the API (see
  // inventory-api.ts / inventory.service.ts) — changing one gives the
  // infinite list a new queryKey, so react-query starts it over from page 1
  // against the actual filtered result set, not a re-filter of whatever
  // pages happened to already be loaded.
  const [stockSearch, setStockSearch] = useState('');
  const [stockCategoryId, setStockCategoryId] = useState<string>(ALL);
  const [stockStatus, setStockStatus] = useState<StockStatusFilter | typeof ALL>(ALL);

  const stockQuery = useInfiniteStockVariants({
    search: stockSearch || undefined,
    categoryId: stockCategoryId === ALL ? undefined : stockCategoryId,
    status: stockStatus === ALL ? undefined : stockStatus,
  });
  const variants = stockQuery.data?.pages.flatMap((p) => p.items) ?? [];
  const loadMoreStock = useCallback(() => {
    if (stockQuery.hasNextPage && !stockQuery.isFetchingNextPage) stockQuery.fetchNextPage();
  }, [stockQuery]);
  const stockSentinelRef = useInfiniteScrollSentinel<HTMLTableRowElement>(loadMoreStock);

  const [movementSearch, setMovementSearch] = useState('');
  const [movementType, setMovementType] = useState<StockMovementType | typeof ALL>(ALL);

  const movementsQuery = useInfiniteMovements({
    search: movementSearch || undefined,
    type: movementType === ALL ? undefined : movementType,
  });
  const movements = movementsQuery.data?.pages.flatMap((p) => p.items) ?? [];
  const loadMoreMovements = useCallback(() => {
    if (movementsQuery.hasNextPage && !movementsQuery.isFetchingNextPage) movementsQuery.fetchNextPage();
  }, [movementsQuery]);
  const movementsSentinelRef = useInfiniteScrollSentinel<HTMLTableRowElement>(loadMoreMovements);

  // Fresh lookup (not a snapshot) so an in-dialog threshold edit is reflected
  // immediately without needing to close and reopen it.
  const selectedVariant = variants.find((v) => v.id === selectedVariantId) ?? null;

  return (
    <div>
      <StickyHeader>
        <PageHeader
          title="Stock"
          description="Niveaux de stock par SKU et historique des mouvements"
          actions={
            <RecordMovementDialog
              products={products.data?.items ?? []}
              trigger={
                <Button size="sm">
                  <Plus className="mr-1.5 h-4 w-4" /> Mouvement de stock
                </Button>
              }
            />
          }
        />
      </StickyHeader>

      {/* items-start keeps each card sized to its own content instead of the
          grid default (stretch); each card scrolls independently within its
          own max-height, and both lists load more pages as you scroll near
          the bottom (infinite scroll) rather than paging through a footer. */}
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="space-y-3">
            <CardTitle className="text-base">Niveaux de stock</CardTitle>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un produit ou un SKU…"
                  className="pl-8"
                  value={stockSearch}
                  onChange={(e) => setStockSearch(e.target.value)}
                />
              </div>
              <Select value={stockCategoryId} onValueChange={setStockCategoryId}>
                <SelectTrigger className="sm:w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Toutes catégories</SelectItem>
                  {categories.data?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={stockStatus} onValueChange={(v) => setStockStatus(v as StockStatusFilter | typeof ALL)}>
                <SelectTrigger className="sm:w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Tous statuts</SelectItem>
                  <SelectItem value="LOW">Stock bas</SelectItem>
                  <SelectItem value="OK">OK</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="max-h-[600px] overflow-y-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produit</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stockQuery.isLoading && <TableSkeletonRows columns={4} />}
                {variants.map((v) => (
                  <TableRow key={v.id} className="cursor-pointer" onClick={() => setSelectedVariantId(v.id)}>
                    <TableCell>
                      <p className="font-medium">{v.productName}</p>
                      <p className="text-xs text-muted-foreground">
                        {v.size} / {v.color}
                      </p>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{v.sku}</TableCell>
                    <TableCell className="text-right font-medium">{v.quantity}</TableCell>
                    <TableCell>
                      {v.quantity <= v.lowStockThreshold ? (
                        <StatusBadge label="Stock bas" tone="critical" />
                      ) : (
                        <StatusBadge label="OK" tone="good" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {variants.length === 0 && !stockQuery.isLoading && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                      Aucun SKU
                    </TableCell>
                  </TableRow>
                )}
                {/* Sentinel: an empty, zero-height row the IntersectionObserver
                    watches — once it scrolls into view, the next page loads. */}
                <TableRow ref={stockSentinelRef}>
                  <TableCell colSpan={4} className="p-0" />
                </TableRow>
                <InfiniteScrollFooter colSpan={4} isFetchingNextPage={stockQuery.isFetchingNextPage} />
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-3">
            <CardTitle className="text-base">Derniers mouvements</CardTitle>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un produit, un SKU ou un motif…"
                  className="pl-8"
                  value={movementSearch}
                  onChange={(e) => setMovementSearch(e.target.value)}
                />
              </div>
              <Select value={movementType} onValueChange={(v) => setMovementType(v as StockMovementType | typeof ALL)}>
                <SelectTrigger className="sm:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Tous types</SelectItem>
                  <SelectItem value="IN">Entrée</SelectItem>
                  <SelectItem value="OUT">Sortie</SelectItem>
                  <SelectItem value="ADJUSTMENT">Ajustement</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="max-h-[600px] overflow-y-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Qté</TableHead>
                  <TableHead>Motif</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movementsQuery.isLoading && <TableSkeletonRows columns={4} />}
                {movements.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {formatDate(m.createdAt)}
                    </TableCell>
                    <TableCell>{MOVEMENT_LABEL[m.type]}</TableCell>
                    <TableCell className="text-right">{m.quantity}</TableCell>
                    <TableCell className="line-clamp-3 min-w-[200px] text-xs text-muted-foreground">
                      {m.reason ?? '—'}
                    </TableCell>
                  </TableRow>
                ))}
                {movements.length === 0 && !movementsQuery.isLoading && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                      Aucun mouvement enregistré
                    </TableCell>
                  </TableRow>
                )}
                <TableRow ref={movementsSentinelRef}>
                  <TableCell colSpan={4} className="p-0" />
                </TableRow>
                <InfiniteScrollFooter colSpan={4} isFetchingNextPage={movementsQuery.isFetchingNextPage} />
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <VariantDetailDialog
        variant={selectedVariant}
        open={!!selectedVariant}
        onOpenChange={(open) => !open && setSelectedVariantId(null)}
      />
    </div>
  );
}
