import { useState } from 'react';
import { MoreHorizontal, Plus, Search } from 'lucide-react';
import type { ProductionStatus } from '@plastimatic/shared';
import { formatDate } from '@plastimatic/shared';
import { PageHeader } from '@/components/page-header';
import { StickyHeader } from '@/components/sticky-header';
import { PaginationFooter } from '@/components/pagination-footer';
import { TableSkeletonRows } from '@/components/table-skeleton';
import { ProductionStatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useCategories, useProducts } from '@/features/catalog/api/catalog-api';
import { useProductionBatches } from '../api/production-api';
import { NewBatchDialog } from '../components/new-batch-dialog';
import { UpdateBatchDialog } from '../components/update-batch-dialog';
import { BatchDetailDialog } from '../components/batch-detail-dialog';

const PAGE_SIZE = 10;
const ALL = 'all';

export function ProductionPage() {
  // pageSize:100 here is just "give me enough products for the variant
  // picker dropdown" — this page's own pagination (below) is for the
  // batches table, a separate, independent list.
  const products = useProducts({ page: 1, pageSize: 100 });
  const categories = useCategories();

  // Every filter below is a real query param forwarded to the API (see
  // production.service.ts's listBatches) — not a client-side re-filter of
  // whatever page happens to already be loaded.
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<string>(ALL);
  const [status, setStatus] = useState<ProductionStatus | typeof ALL>(ALL);
  const [page, setPage] = useState(1);

  const batches = useProductionBatches({
    search: search || undefined,
    categoryId: categoryId === ALL ? undefined : categoryId,
    status: status === ALL ? undefined : status,
    page,
    pageSize: PAGE_SIZE,
  });
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const selectedBatch = batches.data?.items.find((b) => b.id === selectedBatchId) ?? null;

  const updateFilter = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    setPage(1);
  };

  return (
    <div>
      <StickyHeader>
        <PageHeader
          title="Production"
          description="Lots de fabrication, rendement et suivi des défauts"
          actions={
            <NewBatchDialog
              products={products.data?.items ?? []}
              trigger={
                <Button size="sm">
                  <Plus className="mr-1.5 h-4 w-4" /> Nouveau lot
                </Button>
              }
            />
          }
        />
      </StickyHeader>

      <Card>
        <CardContent className="space-y-3 border-b p-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un lot, un produit ou un SKU…"
                className="pl-8"
                value={search}
                onChange={(e) => updateFilter(setSearch)(e.target.value)}
              />
            </div>
            <Select value={categoryId} onValueChange={updateFilter(setCategoryId)}>
              <SelectTrigger className="sm:w-48">
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
            <Select value={status} onValueChange={updateFilter(setStatus) as (v: string) => void}>
              <SelectTrigger className="sm:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tous statuts</SelectItem>
                <SelectItem value="PLANNED">Planifié</SelectItem>
                <SelectItem value="IN_PROGRESS">En cours</SelectItem>
                <SelectItem value="COMPLETED">Terminé</SelectItem>
                <SelectItem value="CANCELLED">Annulé</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lot</TableHead>
                <TableHead>Produit</TableHead>
                <TableHead className="text-right">Planifié</TableHead>
                <TableHead className="text-right">Produite</TableHead>
                <TableHead className="text-right">Défauts</TableHead>
                <TableHead>Début</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {batches.isLoading && <TableSkeletonRows columns={8} />}
              {batches.data?.items.map((batch) => (
                <TableRow key={batch.id}>
                  <TableCell className="font-medium">{batch.batchNumber}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {batch.productName} — {batch.size}/{batch.color}
                  </TableCell>
                  <TableCell className="text-right">{batch.plannedQty}</TableCell>
                  <TableCell className="text-right">{batch.producedQty}</TableCell>
                  <TableCell className="text-right">{batch.defectQty}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatDate(batch.startDate)}</TableCell>
                  <TableCell>
                    <ProductionStatusBadge status={batch.status} />
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setSelectedBatchId(batch.id)}>Voir</DropdownMenuItem>
                        <UpdateBatchDialog
                          batch={batch}
                          trigger={
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>Modifier</DropdownMenuItem>
                          }
                        />
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {batches.data?.items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-sm text-muted-foreground">
                    Aucun lot de production
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
        {batches.data && (
          <PaginationFooter
            page={batches.data.page}
            totalPages={batches.data.totalPages}
            total={batches.data.total}
            pageSize={batches.data.pageSize}
            onPageChange={setPage}
          />
        )}
      </Card>

      <BatchDetailDialog
        batch={selectedBatch}
        open={!!selectedBatch}
        onOpenChange={(open) => !open && setSelectedBatchId(null)}
      />
    </div>
  );
}
