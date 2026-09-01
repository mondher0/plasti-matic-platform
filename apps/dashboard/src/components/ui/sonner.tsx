import { Toaster as SonnerToaster } from 'sonner';

export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      // Manual dismiss (X), not just the auto-dismiss timeout — a toast for
      // an action the user already saw (e.g. "Produit créé") shouldn't force
      // them to wait it out if they want it gone sooner.
      closeButton
      toastOptions={{
        classNames: {
          toast: 'bg-card text-card-foreground border shadow-lg',
          description: 'text-muted-foreground',
          closeButton: 'bg-background border-border text-foreground hover:bg-accent',
        },
      }}
    />
  );
}

export { toast } from 'sonner';
