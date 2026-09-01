import { formatDate, formatPercent, type ProductionBatch } from '@plastimatic/shared';
import { ProductionStatusBadge } from '@/components/status-badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';

export function BatchDetailDialog({
  batch,
  open,
  onOpenChange,
}: {
  batch: ProductionBatch | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!batch) return null;

  const yieldRate = batch.plannedQty > 0 ? batch.producedQty / batch.plannedQty : 0;
  const defectRate = batch.producedQty > 0 ? batch.defectQty / batch.producedQty : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Lot {batch.batchNumber}</DialogTitle>
        </DialogHeader>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <dt className="text-muted-foreground">Produit</dt>
          <dd>
            {batch.productName} — {batch.size}/{batch.color}
          </dd>
          <dt className="text-muted-foreground">Statut</dt>
          <dd>
            <ProductionStatusBadge status={batch.status} />
          </dd>
          <dt className="text-muted-foreground">Date de début</dt>
          <dd>{formatDate(batch.startDate)}</dd>
          <dt className="text-muted-foreground">Date de fin</dt>
          <dd>{batch.endDate ? formatDate(batch.endDate) : '—'}</dd>
        </dl>

        <Separator />

        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <dt className="text-muted-foreground">Quantité planifiée</dt>
          <dd>{batch.plannedQty}</dd>
          <dt className="text-muted-foreground">Quantité produite</dt>
          <dd>{batch.producedQty}</dd>
          <dt className="text-muted-foreground">Défauts</dt>
          <dd>{batch.defectQty}</dd>
          <dt className="text-muted-foreground">Rendement</dt>
          <dd className="font-medium">{formatPercent(yieldRate)}</dd>
          <dt className="text-muted-foreground">Taux de défauts</dt>
          <dd className="font-medium">{formatPercent(defectRate)}</dd>
        </dl>

        {batch.status === 'COMPLETED' && (
          <p className="text-xs text-muted-foreground">
            Ce lot est terminé : la quantité produite a déjà été ajoutée au stock.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
