import { useState } from 'react';
import { MoreHorizontal, Package, Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@plastimatic/shared';
import { ApiError } from '@/lib/api-client';
import { PageHeader } from '@/components/page-header';
import { StickyHeader } from '@/components/sticky-header';
import { PaginationFooter } from '@/components/pagination-footer';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { TableSkeletonRows } from '@/components/table-skeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useCategories, useDeleteProduct, useProducts, useUpdateProduct } from '../api/catalog-api';
import { ProductFormDialog } from '../components/product-form-dialog';
import { ProductDetailDialog } from '../components/product-detail-dialog';
import { ProductEditDialog } from '../components/product-edit-dialog';

const PAGE_SIZE = 10;

export function CatalogPage() {
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);

  const categories = useCategories();
  const products = useProducts({ search: search || undefined, categoryId, page, pageSize: PAGE_SIZE }, { poll: true });
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  // Any filter change invalidates the current page number — go back to 1
  // rather than risk landing on a page that no longer exists.
  const updateSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };
  const updateCategory = (value: string | undefined) => {
    setCategoryId(value);
    setPage(1);
  };

  return (
    <div>
      <StickyHeader>
        <PageHeader
          title="Catalogue"
          description="Produits, variantes et prix"
          actions={
            <ProductFormDialog
              trigger={
                <Button size="sm">
                  <Plus className="mr-1.5 h-4 w-4" /> Nouveau produit
                </Button>
              }
            />
          }
        />

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un produit…"
              className="pl-8"
              value={search}
              onChange={(e) => updateSearch(e.target.value)}
            />
          </div>
          <Select value={categoryId ?? 'all'} onValueChange={(v) => updateCategory(v === 'all' ? undefined : v)}>
            <SelectTrigger className="sm:w-56">
              <SelectValue placeholder="Toutes les catégories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les catégories</SelectItem>
              {categories.data?.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </StickyHeader>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14" />
                <TableHead>Produit</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead className="text-right">Variantes</TableHead>
                <TableHead className="text-right">Prix</TableHead>
                <TableHead className="text-right">Stock total</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.isLoading && <TableSkeletonRows columns={8} />}
              {products.data?.items.map((product) => {
                const prices = product.variants?.map((v) => v.price) ?? [];
                const totalStock = product.variants?.reduce((s, v) => s + v.quantity, 0) ?? 0;
                const minPrice = prices.length ? Math.min(...prices) : 0;
                const maxPrice = prices.length ? Math.max(...prices) : 0;
                return (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-md bg-muted">
                        {product.images[0] ? (
                          <img src={product.images[0]} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <Package className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell className="text-muted-foreground">{product.category?.name}</TableCell>
                    <TableCell className="text-right">{product.variants?.length ?? 0}</TableCell>
                    <TableCell className="text-right">
                      {minPrice === maxPrice ? formatCurrency(minPrice) : `${formatCurrency(minPrice)} – ${formatCurrency(maxPrice)}`}
                    </TableCell>
                    <TableCell className="text-right">{totalStock}</TableCell>
                    <TableCell>
                      <Badge variant={product.isActive ? 'default' : 'secondary'}>
                        {product.isActive ? 'Actif' : 'Inactif'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <ProductDetailDialog
                            product={product}
                            trigger={
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>Voir</DropdownMenuItem>
                            }
                          />
                          <ProductEditDialog
                            product={product}
                            trigger={
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>Modifier</DropdownMenuItem>
                            }
                          />
                          <DropdownMenuItem
                            onClick={() =>
                              updateProduct.mutate(
                                { id: product.id, input: { isActive: !product.isActive } },
                                { onSuccess: () => toast.success('Produit mis à jour') },
                              )
                            }
                          >
                            {product.isActive ? 'Désactiver' : 'Activer'}
                          </DropdownMenuItem>
                          <ConfirmDialog
                            trigger={
                              <DropdownMenuItem
                                className="text-destructive"
                                onSelect={(e) => e.preventDefault()}
                              >
                                Supprimer
                              </DropdownMenuItem>
                            }
                            title="Supprimer ce produit ?"
                            description={`"${product.name}" sera définitivement supprimé.`}
                            confirmLabel="Supprimer"
                            destructive
                            onConfirm={() =>
                              deleteProduct.mutate(product.id, {
                                onSuccess: () => toast.success('Produit supprimé'),
                                onError: (err) =>
                                  toast.error(err instanceof ApiError ? err.message : 'Échec de la suppression'),
                              })
                            }
                          />
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
              {products.data?.items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-sm text-muted-foreground">
                    Aucun produit trouvé
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
        {products.data && (
          <PaginationFooter
            page={products.data.page}
            totalPages={products.data.totalPages}
            total={products.data.total}
            pageSize={products.data.pageSize}
            onPageChange={setPage}
          />
        )}
      </Card>
    </div>
  );
}
