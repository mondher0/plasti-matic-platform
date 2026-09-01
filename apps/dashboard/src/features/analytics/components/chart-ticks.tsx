// Custom Recharts axis-tick renderers.
//
// Recharts' default tick just draws the raw label as one unwrapped (or, for a
// constrained-width category axis, word-wrapped-to-N-lines) <text> node — for
// user-entered data like batch numbers or product names that's either
// illegible (rotated text running off the chart) or eats vertical/horizontal
// space with multi-line wrapping and inconsistent row heights. These
// truncate to a single line with an ellipsis and carry the full label in a
// native SVG <title>, which the browser shows as a tooltip on hover — no
// extra JS/positioning needed, and no risk of the popper-nesting issues a
// portal-based tooltip would hit inside an SVG.
//
// Recharts calls whatever you pass as `tick` with its own computed `x`/`y`
// (and `payload.value` for the label) — passing a component here means you
// lose the `tick={{ fontSize, fill }}` shorthand, so each renderer below
// re-declares that styling itself to match what it replaces.

function truncateLabel(value: unknown, maxChars: number): { full: string; short: string } {
  const full = String(value ?? '');
  const short = full.length > maxChars ? `${full.slice(0, maxChars - 1)}…` : full;
  return { full, short };
}

interface TickProps {
  x?: number;
  y?: number;
  payload?: { value?: unknown };
}

/** Bottom X-axis ticks rotated -30° (long single-word-ish codes like batch
 * numbers) — mirrors Recharts' own "customized tick" recipe for the g/text
 * structure, plus truncation + a <title> tooltip. */
export function RotatedTruncatedTick({ x = 0, y = 0, payload }: TickProps) {
  const { full, short } = truncateLabel(payload?.value, 14);
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={10} textAnchor="end" transform="rotate(-30)" fontSize={10} fill="hsl(var(--muted-foreground))">
        <title>{full}</title>
        {short}
      </text>
    </g>
  );
}

/** Bottom X-axis ticks, horizontal, centered under each bar (category
 * names read left-to-right, not rotated). */
export function HorizontalTruncatedTick({ x = 0, y = 0, payload }: TickProps) {
  const { full, short } = truncateLabel(payload?.value, 12);
  return (
    <text x={x} y={y} dy={12} textAnchor="middle" fontSize={11} fill="hsl(var(--muted-foreground))">
      <title>{full}</title>
      {short}
    </text>
  );
}

/** Left-side Y-axis ticks for a `type="category"` axis (e.g. product names
 * on a horizontal bar chart) — right-aligned, single line. */
export function CategoryTruncatedTick({ x = 0, y = 0, payload }: TickProps) {
  const { full, short } = truncateLabel(payload?.value, 18);
  return (
    <text x={x} y={y} dy={4} textAnchor="end" fontSize={11} fill="hsl(var(--foreground))">
      <title>{full}</title>
      {short}
    </text>
  );
}
