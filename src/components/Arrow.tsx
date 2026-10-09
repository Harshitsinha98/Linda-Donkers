/** Inline SVG arrow (font-independent). Rotate with `dir`. */
export function Arrow({ dir = "right", className = "h-[1em] w-[1em]" }: { dir?: "right" | "left" | "up" | "up-right"; className?: string }) {
  const rot = { right: 0, left: 180, up: -90, "up-right": -45 }[dir];
  return (
    <svg viewBox="0 0 24 24" className={`inline-block shrink-0 ${className}`} style={{ transform: `rotate(${rot}deg)` }} aria-hidden fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12h16M14 6l6 6-6 6" />
    </svg>
  );
}
