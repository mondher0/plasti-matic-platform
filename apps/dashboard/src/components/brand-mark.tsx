import { cn } from '@/lib/utils';
import maticLogo from '@/assets/matic-logo.png';

/**
 * The brand mark, full stop — mirrors the shop app's identical component
 * (apps/shop/src/components/brand-mark.tsx): just the actual logo asset
 * (`src/assets/matic-logo.png`), no icon box or "Plasti" text alongside it.
 *
 * `on="light"` (default) is for the dashboard's normal light surfaces —
 * renders the logo as authored (a dark glyph on transparent). `on="dark"`
 * inverts it to a solid white silhouette for a primary-colored/dark
 * surface, the same as the shop's version, even though the dashboard
 * doesn't currently have one — kept for parity so both components stay
 * drop-in interchangeable if that ever changes.
 */
export function BrandMark({
  size = 'md',
  on = 'light',
  className,
}: {
  size?: 'sm' | 'md' | 'lg';
  on?: 'light' | 'dark';
  className?: string;
}) {
  const logoHeight = { sm: 'h-7', md: 'h-9', lg: 'h-14' }[size];

  return (
    <img
      src={maticLogo}
      alt="Matic"
      className={cn(logoHeight, 'w-auto object-contain', className)}
      style={on === 'dark' ? { filter: 'brightness(0) invert(1)' } : undefined}
    />
  );
}
