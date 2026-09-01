import { Package } from 'lucide-react';
import { formatCurrency, formatDate, type Product } from '@plastimatic/shared';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export function ProductDetailDialog({ product, trigger }: { product: Product; trigger: React.ReactNode }) {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product.name}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap gap-2">
          {product.images.length > 0 ? (
            product.images.map((url) => (
              <img key={url} src={url} alt="" className="h-20 w-20 rounded-md border object-cover" />
            ))
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-md border bg-muted">
              <Package className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <dt className="text-muted-foreground">Catégorie</dt>
          <dd>{product.category?.name}</dd>
          <dt className="text-muted-foreground">Slug</dt>
          <dd className="font-mono text-xs">{product.slug}</dd>
          <dt className="text-muted-foreground">Statut</dt>
          <dd>
            <Badge variant={product.isActive ? 'default' : 'secondary'}>
              {product.isActive ? 'Actif' : 'Inactif'}
            </Badge>
          </dd>
          <dt className="text-muted-foreground">Créé le</dt>
          <dd>{formatDate(product.createdAt)}</dd>
        </dl>

        {product.description && (
          <>
            <Separator />
            <p className="text-sm text-muted-foreground">{product.description}</p>
          </>
        )}

        <Separator />

        <div>
          <p className="mb-2 text-sm font-medium">Variantes ({product.variants?.length ?? 0})</p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Taille</TableHead>
                <TableHead>Couleur</TableHead>
                <TableHead className="text-right">Prix</TableHead>
                <TableHead className="text-right">Coût</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="text-right">Seuil</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {product.variants?.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-mono text-xs">{v.sku}</TableCell>
                  <TableCell>{v.size}</TableCell>
                  <TableCell>{v.color}</TableCell>
                  <TableCell className="text-right">{formatCurrency(v.price)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(v.costPrice)}</TableCell>
                  <TableCell className="text-right">{v.quantity}</TableCell>
                  <TableCell className="text-right">{v.lowStockThreshold}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
