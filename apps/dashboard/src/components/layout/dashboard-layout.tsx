import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  BarChart3,
  Boxes,
  Factory,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  ShoppingCart,
  User as UserIcon,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { BrandMark } from '@/components/brand-mark';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { useAuth } from '@/features/auth/auth-context';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Vue d\'ensemble', icon: LayoutDashboard, end: true },
  { to: '/analytics', label: 'Analyses avancées', icon: BarChart3 },
  { to: '/catalog', label: 'Catalogue', icon: Package },
  { to: '/inventory', label: 'Stock', icon: Boxes },
  { to: '/production', label: 'Production', icon: Factory },
  { to: '/orders', label: 'Commandes', icon: ShoppingCart },
];

const ADMIN_NAV_ITEMS: NavItem[] = [{ to: '/users', label: 'Utilisateurs', icon: Users }];

// Shared between the always-visible desktop <aside> and the mobile drawer
// (<Sheet>) so the two never drift out of sync. `onNavigate` closes the
// drawer on mobile once a link is picked — the desktop sidebar doesn't need
// it (nothing to close) so it's optional.
function SidebarNav({ navItems, onNavigate }: { navItems: NavItem[]; onNavigate?: () => void }) {
  const { logout } = useAuth();

  return (
    <>
      <div className="flex h-14 shrink-0 items-center gap-2 border-b px-5">
        <BrandMark size="sm" />
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      {/* Pinned below the (scrollable) nav list, not part of it — a border
          sets it apart visually since it's an action, not a destination. */}
      <div className="shrink-0 border-t p-3">
        <button
          type="button"
          onClick={() => {
            onNavigate?.();
            logout();
          }}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <LogOut className="h-4 w-4" />
          Déconnexion
        </button>
      </div>
    </>
  );
}

export function DashboardLayout() {
  const { user, logout } = useAuth();
  const [navOpen, setNavOpen] = useState(false);
  const navItems = user?.role === 'ADMIN' ? [...NAV_ITEMS, ...ADMIN_NAV_ITEMS] : NAV_ITEMS;

  return (
    // h-screen + overflow-hidden (not min-h-screen) is what actually pins the
    // sidebar and topbar in place: with min-h-screen, once a page's content
    // got taller than the viewport the whole shell grew past 100vh and the
    // *document* scrolled, dragging the sidebar/header along with it. Locking
    // the shell to exactly the viewport height and letting only <main> scroll
    // internally is what makes them stay fixed.
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className="hidden w-64 shrink-0 flex-col overflow-y-auto border-r bg-card md:flex">
        <SidebarNav navItems={navItems} />
      </aside>

      {/* Below md, the <aside> above is display:none — this Sheet is the
          only way to reach navigation, opened from the hamburger button in
          the header. */}
      <Sheet open={navOpen} onOpenChange={setNavOpen}>
        <SheetContent className="md:hidden">
          <SheetTitle>Navigation</SheetTitle>
          <SidebarNav navItems={navItems} onNavigate={() => setNavOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-card px-4 md:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 md:hidden"
            onClick={() => setNavOpen(true)}
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Ouvrir le menu</span>
          </Button>
          <BrandMark size="sm" className="md:hidden" />
          <div className="ml-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 px-2">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={user?.avatarUrl ?? undefined} />
                    <AvatarFallback>{user?.firstName?.[0]}{user?.lastName?.[0]}</AvatarFallback>
                  </Avatar>
                  <span className="hidden text-sm font-medium sm:inline">
                    {user?.firstName} {user?.lastName}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                  <p className="text-sm font-medium">{user?.email}</p>
                  <p className="text-xs font-normal text-muted-foreground">{user?.role}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <NavLink to="/account">
                    <UserIcon className="mr-2 h-4 w-4" />
                    Mon profil
                  </NavLink>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Déconnexion
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        {/* No top padding here on purpose — StickyHeader supplies it (pt-4/md:pt-6)
            so its stuck position exactly meets this element's own clip boundary.
            A gap here (e.g. from p-4/md:p-6 top padding) would sit *between* that
            boundary and where the sticky header stops, and scrolled-away content
            would remain visible in it, peeking out above the sticky header. */}
        <main className="flex-1 overflow-y-auto px-6 pb-6 md:px-10 md:pb-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
