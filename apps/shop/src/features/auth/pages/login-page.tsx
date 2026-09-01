import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { AlertCircle, LogIn, Mail } from 'lucide-react';
import { LoginSchema, type LoginInput } from '@plastimatic/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AuthSplitLayout } from '@/components/layout/auth-split-layout';
import { ApiError } from '@/lib/api-client';
import { authApi } from '../api/auth-api';
import { useAuth } from '../auth-context';
import { PasswordInput } from '../components/password-input';

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<LoginInput>({ resolver: zodResolver(LoginSchema), defaultValues: { email: '', password: '' } });

  const onSubmit = async (values: LoginInput) => {
    setServerError(null);
    setIsSubmitting(true);
    try {
      const response = await authApi.login(values);
      await login(response);
      navigate('/account/orders', { replace: true });
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : 'Une erreur est survenue');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthSplitLayout>
      <Card className="mx-auto w-full max-w-md rounded-2xl border-border/60 shadow-lg">
        <CardHeader className="items-center text-center">
          <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <LogIn className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="font-display text-2xl">Connexion</CardTitle>
          <CardDescription>Accédez à votre historique de commandes</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input type="email" autoComplete="username" className="pl-9" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mot de passe</FormLabel>
                    <FormControl>
                      <PasswordInput autoComplete="current-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {serverError && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>{serverError}</p>
                </div>
              )}
              <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Connexion…' : 'Se connecter'}
              </Button>
            </form>
          </Form>
          <p className="mt-5 text-center text-sm text-muted-foreground">
            Pas encore de compte ?{' '}
            <Link to="/register" className="font-medium text-primary hover:underline">
              Créer un compte
            </Link>
          </p>
        </CardContent>
      </Card>
    </AuthSplitLayout>
  );
}
