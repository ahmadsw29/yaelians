/**
 * Pure scroll-reveal math for the home screen.
 * Returns the scrollY range over which an item at `itemTop` (content coords)
 * animates from hidden-ish to fully shown, or null when the item is already
 * inside the initial viewport (so the first screen never starts blank).
 */
export function revealScrollRange(itemTop: number, viewportHeight: number, distance = 220, inset = 140, contentHeight?: number): [number, number] | null {
  if (!Number.isFinite(itemTop) || !Number.isFinite(viewportHeight) || viewportHeight <= 0) return null;
  const start = itemTop - viewportHeight + inset;
  if (start <= 0) return null;
  // Start above the fixed tabs, where the motion can actually be seen.
  // The last card must finish revealing before the page runs out of scroll.
  const maxScroll = contentHeight && Number.isFinite(contentHeight) ? Math.max(0, contentHeight - viewportHeight) : Infinity;
  const end = Math.min(start + Math.max(1, distance), maxScroll);
  if (end <= 0) return null;
  return [Math.min(start, Math.max(0, end - 1)), end];
}

/** Progress 0..1 for a given scrollY; content past the range stays fully visible. */
export function revealProgress(scrollY: number, range: [number, number] | null): number {
  if (!range) return 1;
  const [a, b] = range;
  if (scrollY >= b) return 1;
  if (scrollY <= a) return 0;
  return (scrollY - a) / (b - a);
}
