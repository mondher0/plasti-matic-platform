import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { StickyHeader } from '@/components/sticky-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { ApiError } from '@/lib/api-client';
import { useAuth } from '@/features/auth/auth-context';
import { AvatarUpload } from '../components/avatar-upload';
import { useChangePassword, useUpdateProfile } from '../api/account-api';

const ProfileFormSchema = z.object({
  firstName: z.string().min(1, 'Requis').max(80),
  lastName: z.string().min(1, 'Requis').max(80),
  email: z.string().email('Adresse e-mail invalide'),
});
type ProfileFormValues = z.infer<typeof ProfileFormSchema>;

const PasswordFormSchema = z
  .object({
    currentPassword: z.string().min(1, 'Requis'),
    newPassword: z.string().min(8, 'Au moins 8 caractères').max(72),
    confirmPassword: z.string().min(1, 'Requis'),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  });
type PasswordFormValues = z.infer<typeof PasswordFormSchema>;

function ProfileTab() {
  const { user } = useAuth();
  const updateProfile = useUpdateProfile();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(ProfileFormSchema),
    values: { firstName: user?.firstName ?? '', lastName: user?.lastName ?? '', email: user?.email ?? '' },
  });

  if (!user) return null;

  const onSubmit = async (values: ProfileFormValues) => {
    try {
      await updateProfile.mutateAsync(values);
      toast.success('Profil mis à jour');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Échec de la mise à jour');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Informations du profil</CardTitle>
        <CardDescription>Votre nom, e-mail et photo affichés dans le tableau de bord.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <AvatarUpload user={user} />
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
                    <Input type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={updateProfile.isPending}>
              {updateProfile.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

function PasswordTab() {
  const changePassword = useChangePassword();
  const form = useForm<PasswordFormValues>({
    resolver: zodResolver(PasswordFormSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const onSubmit = async (values: PasswordFormValues) => {
    try {
      await changePassword.mutateAsync({ currentPassword: values.currentPassword, newPassword: values.newPassword });
      toast.success('Mot de passe mis à jour');
      form.reset({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Échec de la mise à jour');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Mot de passe</CardTitle>
        <CardDescription>Changez votre mot de passe de connexion.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-sm space-y-4">
            <FormField
              control={form.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mot de passe actuel</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nouveau mot de passe</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirmer le nouveau mot de passe</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={changePassword.isPending}>
              {changePassword.isPending ? 'Enregistrement…' : 'Mettre à jour le mot de passe'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

export function AccountPage() {
  const { user } = useAuth();

  return (
    <div>
      <StickyHeader>
        <PageHeader title="Mon compte" description="Gérez votre profil et votre mot de passe" />
      </StickyHeader>

      {user?.mustChangePassword && (
        <div className="mb-4 flex items-start gap-3 rounded-md border border-status-warning/40 bg-status-warning/10 p-4 text-status-warning">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="text-sm">
            <p className="font-medium">Vous devez changer votre mot de passe pour continuer</p>
            <p className="text-status-warning/90">
              Ce compte a été créé avec un mot de passe temporaire — le reste du tableau de bord reste
              inaccessible tant qu'il n'a pas été remplacé par un mot de passe personnel.
            </p>
          </div>
        </div>
      )}

      <Tabs defaultValue={user?.mustChangePassword ? 'password' : 'profile'}>
        <TabsList>
          <TabsTrigger value="profile">Profil</TabsTrigger>
          <TabsTrigger value="password">Mot de passe</TabsTrigger>
        </TabsList>
        <TabsContent value="profile">
          <ProfileTab />
        </TabsContent>
        <TabsContent value="password">
          <PasswordTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
