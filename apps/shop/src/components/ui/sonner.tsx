import { Toaster as SonnerToaster } from 'sonner';

export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
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
