import { Link, Outlet } from 'react-router-dom';
import { LogOut, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { BrandMark } from '@/components/brand-mark';
import { CartSheet } from '@/features/cart/components/cart-sheet';
import { useAuth } from '@/features/auth/auth-context';
import { useCategories } from '@/features/catalog/api/catalog-api';

export function StorefrontLayout() {
  const { user, logout } = useAuth();
  const categories = useCategories();
  // Header/footer both link into the same category filter the catalog page
  // reads from the URL (see catalog-page.tsx's useSearchParams) — capped at
  // 4 so the header nav never wraps on a mid-size screen.
  const navCategories = categories.data?.slice(0, 4) ?? [];

  return (
    <div className="flex min-h-screen flex-col">
      <div className="bg-primary py-2 text-center text-xs font-medium text-primary-foreground sm:text-sm">
        Fabriqué en Algérie — Équipement professionnel de qualité
      </div>

      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="container flex h-16 items-center justify-between gap-4">
          <Link to="/">
            <BrandMark />
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            <Link to="/" className="text-sm font-medium text-foreground/80 transition-colors hover:text-primary">
              Catalogue
            </Link>
            {navCategories.map((c) => (
              <Link
                key={c.id}
                to={`/?category=${c.id}`}
                className="text-sm font-medium text-foreground/80 transition-colors hover:text-primary"
              >
                {c.name}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-1">
            <CartSheet />
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatarUrl ?? undefined} />
                      <AvatarFallback className="text-xs">
                        {user.firstName[0]}
                        {user.lastName[0]}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>
                    {user.firstName} {user.lastName}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/account/profile">
                      <UserRound className="mr-2 h-4 w-4" />
                      Mon profil
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/account/orders">Mes commandes</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={logout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Déconnexion
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button asChild size="sm" className="ml-1">
                <Link to="/login">Connexion</Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t bg-secondary/40">
        <div className="container grid grid-cols-1 gap-10 py-12 sm:grid-cols-3">
          <div className="space-y-3">
            <BrandMark />
            <p className="max-w-xs text-sm text-muted-foreground">
              Vêtements de travail, équipements de sécurité et chaussures industrielles, fabriqués en
              Algérie.
            </p>
          </div>

          <div>
            <p className="mb-3 text-sm font-semibold">Boutique</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link to="/" className="transition-colors hover:text-primary">
                  Tous les produits
                </Link>
              </li>
              {navCategories.map((c) => (
                <li key={c.id}>
                  <Link to={`/?category=${c.id}`} className="transition-colors hover:text-primary">
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="mb-3 text-sm font-semibold">Compte</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {user ? (
                <>
                  <li>
                    <Link to="/account/profile" className="transition-colors hover:text-primary">
                      Mon profil
                    </Link>
                  </li>
                  <li>
                    <Link to="/account/orders" className="transition-colors hover:text-primary">
                      Mes commandes
                    </Link>
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <Link to="/login" className="transition-colors hover:text-primary">
                      Connexion
                    </Link>
                  </li>
                  <li>
                    <Link to="/register" className="transition-colors hover:text-primary">
                      Créer un compte
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </div>
        </div>
        <div className="border-t py-6">
          <div className="container text-xs text-muted-foreground">
            © {new Date().getFullYear()} EURL Plasti Matic — Bordj Bou Arreridj, Algérie
          </div>
        </div>
      </footer>
    </div>
  );
}
