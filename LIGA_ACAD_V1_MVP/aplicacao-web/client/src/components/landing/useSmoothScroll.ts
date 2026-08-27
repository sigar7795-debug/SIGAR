import { useEffect, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger);

// Roughly clears the fixed header (h-16/68px) plus a little breathing room.
const ANCHOR_OFFSET = 84;

/**
 * Global smooth scroll for the public homepage. Lenis is driven entirely by
 * GSAP's ticker (`autoRaf: false` — itself requestAnimationFrame-based) so
 * there's exactly one animation loop, and `lenis.on("scroll", ScrollTrigger.update)`
 * keeps any current/future ScrollTrigger-based animation (e.g. ScrollRevealTransition,
 * were it migrated to GSAP) reading the same smoothed position.
 *
 * Scoped to wherever it's called from (the homepage) — mount/unmount with the
 * page, so the authenticated dashboard keeps native scroll untouched. Touch
 * input is left native (no `syncTouch`) since smoothing fights the finger and
 * reads as lag rather than polish. Disabled entirely under
 * prefers-reduced-motion, live-updating if that OS setting changes mid-session.
 */
export function useSmoothScroll() {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(query.matches);
    const listener = (e: MediaQueryListEvent) => setReduceMotion(e.matches);
    query.addEventListener("change", listener);
    return () => query.removeEventListener("change", listener);
  }, []);

  useEffect(() => {
    if (reduceMotion) return;

    const lenis = new Lenis({
      lerp: 0.08,
      smoothWheel: true,
      wheelMultiplier: 1,
      autoRaf: false,
    });

    const onLenisScroll = () => ScrollTrigger.update();
    lenis.on("scroll", onLenisScroll);

    const onTick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(onTick);
    gsap.ticker.lagSmoothing(0);

    // Same-page anchor links (#top, #recursos, ...) route through Lenis so they
    // ease in rather than snapping — native keyboard/scrollbar/back-forward
    // scrolling is untouched, since those aren't click events.
    const onClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      const anchor = event.target.closest("a[href^='#']");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href === "#") return;
      const dest = document.querySelector(href);
      if (!dest) return;
      event.preventDefault();
      lenis.scrollTo(dest as HTMLElement, { offset: -ANCHOR_OFFSET });
    };
    document.addEventListener("click", onClick);

    return () => {
      document.removeEventListener("click", onClick);
      gsap.ticker.remove(onTick);
      lenis.off("scroll", onLenisScroll);
      lenis.destroy();
    };
  }, [reduceMotion]);
}
