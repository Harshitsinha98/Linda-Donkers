import Lenis from "lenis";
import { useEffect } from "react";

let lenis: Lenis | null = null;

export function setScrollLocked(locked: boolean) {
  document.documentElement.style.overflow = locked ? "hidden" : "";
  if (locked) lenis?.stop();
  else lenis?.start();
}

export function scrollToTop(immediate = false) {
  if (lenis) lenis.scrollTo(0, { immediate });
  else window.scrollTo({ top: 0, behavior: immediate ? "auto" : "smooth" });
}

/** Smoothly scrolls an element into view, leaving room for the fixed header. */
export function scrollToElement(el: HTMLElement, offset = 110) {
  // `force`: also works while the intro/page curtain has paused smooth scrolling.
  if (lenis) lenis.scrollTo(el, { offset: -offset, force: true });
  else window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - offset, behavior: "smooth" });
}

/** Lenis smooth scrolling (desktop + touch keeps native), disabled for reduced motion. */
export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    lenis = new Lenis({ duration: 1.15, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
    if (document.documentElement.style.overflow === "hidden") lenis.stop();
    let raf = 0;
    const loop = (time: number) => {
      lenis?.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      lenis?.destroy();
      lenis = null;
    };
  }, []);

  return null;
}
