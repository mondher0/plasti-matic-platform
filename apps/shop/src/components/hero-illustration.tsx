/**
 * Coded SVG hero illustration — no image-generation tool is available and no
 * photography asset exists in the repo, so this is a hand-built flat-style
 * composition of the brand's actual product categories (a hard hat, a hi-vis
 * safety vest, a work boot) rather than a generic stock-photo stand-in.
 * Purely decorative: hidden below `lg` so it never competes with the hero's
 * text on small screens.
 */
export function HeroIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 420 420" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="hh-dome" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff7ed" />
          <stop offset="100%" stopColor="#ffe4cc" />
        </linearGradient>
        <linearGradient id="vest-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2b2320" />
          <stop offset="100%" stopColor="#1a1512" />
        </linearGradient>
      </defs>

      {/* floating card: hard hat */}
      <g transform="translate(40,30)">
        <rect x="0" y="0" width="190" height="190" rx="28" fill="white" fillOpacity="0.12" />
        <rect x="0" y="0" width="190" height="190" rx="28" fill="white" fillOpacity="0.06" />
        <g transform="translate(30,45)">
          <ellipse cx="65" cy="98" rx="70" ry="12" fill="#000" opacity="0.12" />
          <path d="M5 88h120a5 5 0 0 0 5-5c0-8-6-14-14-14H14C6 69 0 75 0 83a5 5 0 0 0 5 5Z" fill="url(#hh-dome)" />
          <path
            d="M20 69C20 34 40 8 65 8s45 26 45 61H20Z"
            fill="url(#hh-dome)"
            stroke="white"
            strokeOpacity="0.6"
            strokeWidth="2"
          />
          <rect x="45" y="30" width="40" height="8" rx="4" fill="hsl(24 95% 53%)" opacity="0.85" />
        </g>
      </g>

      {/* floating card: safety vest */}
      <g transform="translate(210,150)">
        <rect x="0" y="0" width="180" height="220" rx="28" fill="white" fillOpacity="0.1" />
        <g transform="translate(35,35)">
          <path
            d="M55 0 30 14v10L6 34 0 130h34l6-58 4 58h68l4-58 6 58h34L150 34l-24-10V14L101 0 76 16Z"
            fill="url(#vest-body)"
          />
          <path d="M20 40 12 128" stroke="hsl(24 95% 58%)" strokeWidth="10" strokeLinecap="round" />
          <path d="M132 40l8 88" stroke="hsl(24 95% 58%)" strokeWidth="10" strokeLinecap="round" />
          <path d="M55 0 30 14v10L6 34" fill="none" stroke="hsl(24 95% 58%)" strokeWidth="5" strokeLinecap="round" />
          <path d="M97 0l25 14v10l24 10" fill="none" stroke="hsl(24 95% 58%)" strokeWidth="5" strokeLinecap="round" />
        </g>
      </g>

      {/* floating card: boot */}
      <g transform="translate(60,250)">
        <rect x="0" y="0" width="160" height="150" rx="28" fill="white" fillOpacity="0.14" />
        <g transform="translate(25,40)">
          <path
            d="M8 0h34v34l40 20c10 5 18 15 18 27v6H0V44C0 20 4 8 8 0Z"
            fill="#fff7ed"
          />
          <path d="M0 87h100v-6c0-6-3-11-8-14l-6 6-10-8-10 8-10-8-10 8-10-8-10 8-10-8-8 6c-5 3-8 8-8 14v6Z" fill="#1a1512" />
          <rect x="8" y="4" width="34" height="8" rx="3" fill="hsl(24 95% 53%)" />
        </g>
      </g>

      <circle cx="360" cy="70" r="8" fill="white" fillOpacity="0.4" />
      <circle cx="20" cy="230" r="6" fill="white" fillOpacity="0.3" />
      <circle cx="380" cy="330" r="10" fill="white" fillOpacity="0.25" />
    </svg>
  );
}
