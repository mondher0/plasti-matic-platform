import { cn } from '@/lib/utils';
import maticLogo from '@/assets/matic-logo.png';

/**
 * The brand mark, full stop — just the actual logo asset
 * (`src/assets/matic-logo.png`, a script "Matic" wordmark), no icon box or
 * extra "Plasti" text alongside it. Earlier versions paired it with a coded
 * icon + "Plasti" label; that read as cluttered and shrunk the logo itself
 * into an afterthought, so this is deliberately just the image, sized to
 * have real presence on its own.
 *
 * `on="light"` (default) is for the app's normal light surfaces — renders
 * the logo as authored (a dark glyph on transparent). `on="dark"` is for a
 * primary-colored or dark panel (hero, footer, the auth split-screen panel)
 * — the source asset is a dark glyph on a transparent background, so
 * `brightness(0) invert(1)` forces a solid white silhouette instead of
 * needing a second exported asset.
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
