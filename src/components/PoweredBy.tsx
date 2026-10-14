/**
 * "Powered by Infiskies" credit shown at the very bottom of the footer.
 * The name has a slow animated shimmer and glows on hover.
 */
export function PoweredBy() {
  return (
    <div className="mt-6 flex justify-center border-t border-linen/10 pt-6">
      <a
        href="https://www.infiskies.com/"
        target="_blank"
        rel="noopener noreferrer"
        className="group inline-flex items-center gap-2 text-xs text-linen/45 transition-colors duration-300 hover:text-linen/80"
        aria-label="Powered by Infiskies"
      >
        <span className="tracking-wide">Powered by</span>
        <span className="relative font-sans text-sm font-semibold tracking-wide">
          {/* base gradient word */}
          <span className="infiskies-shine bg-gradient-to-r from-saffron-soft via-linen to-saffron-soft bg-[length:200%_100%] bg-clip-text text-transparent [animation:infiskies-shine_5s_linear_infinite]">
            Infiskies
          </span>
          {/* glow that fades in on hover */}
          <span aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-r from-saffron-soft via-linen to-saffron-soft bg-clip-text text-transparent opacity-0 blur-[6px] transition-opacity duration-300 group-hover:opacity-70">
            Infiskies
          </span>
          {/* underline that grows on hover */}
          <span aria-hidden className="absolute -bottom-0.5 left-0 h-px w-full origin-left scale-x-0 bg-saffron-soft/70 transition-transform duration-500 group-hover:scale-x-100" />
        </span>
      </a>
    </div>
  );
}
