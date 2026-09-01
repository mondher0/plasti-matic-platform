import type { ReactNode } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { BrandMark } from '@/components/brand-mark';
import { HeroIllustration } from '@/components/hero-illustration';

const HIGHLIGHTS = ['Livraison rapide partout en Algérie', 'Paiement sécurisé', 'Retours faciles sous 14 jours'];

/** Shared two-column shell for the login/register pages: the actual form
 *  (passed as children) on one side, a decorative branded panel on the
 *  other — CSS/gradient + the coded hero SVG, no photography asset exists
 *  in the repo to use instead. Stacks to a single column on small screens. */
export function AuthSplitLayout({ children }: { children: ReactNode }) {
  // `min-h-full` (fill whatever <main className="flex-1"> naturally sizes
  // to) isn't enough on its own here: `main`'s own natural height is driven
  // by *this* content, so on a login/register card shorter than the
  // viewport, main (and this panel) end up shorter than the screen too —
  // leaving the footer's top edge peeking into the very first view instead
  // of staying fully below the fold until an actual scroll. Forcing this
  // panel to be at least a full viewport tall (minus the banner+header
  // above it) is what pushes the footer down past the fold reliably.
  // 101px = the announcement bar (36px) + header (65px, incl. its border)
  // in storefront-layout.tsx — measured, not guessed; update this alongside
  // either of those.
  return (
    <div className="grid min-h-[calc(100dvh-101px)] grid-cols-1 md:grid-cols-2">
      <div className="relative hidden flex-col overflow-hidden bg-gradient-to-br from-primary to-primary-dark p-10 text-primary-foreground md:flex">
        <BrandMark on="dark" size="md" />

        <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-8 py-8">
          <HeroIllustration className="w-full max-w-[280px]" />
          <div className="max-w-sm space-y-3 text-center">
            <h2 className="font-display text-3xl font-bold leading-tight">
              Équipements professionnels qui tiennent la distance
            </h2>
            <p className="text-primary-foreground/90">
              Vêtements de travail, équipements de sécurité et chaussures industrielles, fabriqués en
              Algérie.
            </p>
          </div>
        </div>

        <ul className="relative z-10 space-y-2.5">
          {HIGHLIGHTS.map((label) => (
            <li key={label} className="flex items-center gap-2.5 text-sm text-primary-foreground/90">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-primary-foreground" />
              {label}
            </li>
          ))}
        </ul>

        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-24 -left-10 h-64 w-64 rounded-full bg-black/10" />
        <div className="pointer-events-none absolute right-10 top-1/3 h-24 w-24 rounded-full bg-white/5" />
      </div>

      <div className="flex flex-col justify-center bg-secondary/30 px-4 py-16">{children}</div>
    </div>
  );
}
