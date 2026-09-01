import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Check, Copy, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { CreateUserSchema, type CreateUserInput, type CreateUserResponse } from '@plastimatic/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { ApiError } from '@/lib/api-client';
import { useCreateUser } from '../api/users-api';

const ROLE_LABEL = { ADMIN: 'Administrateur', STAFF: 'Staff' } as const;

export function CreateUserDialog({ trigger }: { trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  // The plaintext password only exists here, in memory, for as long as this
  // dialog stays open on this one success screen — never persisted, never
  // refetchable once the admin closes it.
  const [created, setCreated] = useState<CreateUserResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const createUser = useCreateUser();

  const form = useForm<CreateUserInput>({
    resolver: zodResolver(CreateUserSchema),
    defaultValues: { firstName: '', lastName: '', email: '', role: 'STAFF' },
  });

  const onSubmit = async (values: CreateUserInput) => {
    try {
      const response = await createUser.mutateAsync(values);
      setCreated(response);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Échec de la création');
    }
  };

  const copyPassword = async () => {
    if (!created) return;
    await navigator.clipboard.writeText(created.temporaryPassword);
    setCopied(true);
    toast.success('Mot de passe copié');
    setTimeout(() => setCopied(false), 2000);
  };

  // Only this explicit "Terminé" click (or the dialog's own X) actually
  // closes it and resets the form — a deliberate exception to this app's
  // usual auto-close-on-success dialogs, since the one-time password would
  // otherwise vanish before the admin has a chance to copy it.
  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setCreated(null);
      form.reset();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        {created ? (
          <>
            <DialogHeader>
              <DialogTitle>Utilisateur créé</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Communiquez ce mot de passe temporaire à{' '}
              <span className="font-medium text-foreground">
                {created.user.firstName} {created.user.lastName}
              </span>
              . Il ne sera plus jamais affiché — {created.user.firstName} devra le changer dès sa première
              connexion.
            </p>
            <div className="flex items-center gap-2 rounded-md border bg-muted p-3">
              <KeyRound className="h-4 w-4 shrink-0 text-muted-foreground" />
              <code className="flex-1 truncate font-mono text-sm">{created.temporaryPassword}</code>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={copyPassword}>
                {copied ? <Check className="h-4 w-4 text-status-good" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <DialogFooter>
              <Button type="button" onClick={() => handleOpenChange(false)}>
                Terminé
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Nouvel utilisateur</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prénom</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nom</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-mail</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="prenom.nom@plasti-matic.com" {...field} />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        Doit se terminer par <span className="font-mono">@plasti-matic.com</span>
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rôle</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(Object.keys(ROLE_LABEL) as (keyof typeof ROLE_LABEL)[]).map((r) => (
                            <SelectItem key={r} value={r}>
                              {ROLE_LABEL[r]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={createUser.isPending}>
                    {createUser.isPending ? 'Création…' : "Créer l'utilisateur"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
