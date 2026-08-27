import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const WORDS = ["Registre.", "Compare.", "Decida."];

export function EditorialBand() {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const track = trackRef.current;
    if (!section || !track) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        track,
        { x: 0 },
        {
          x: () => -(track.scrollWidth - window.innerWidth),
          ease: "none",
          scrollTrigger: {
            trigger: section,
            start: "top 75%",
            end: "bottom 15%",
            scrub: true,
            invalidateOnRefresh: true,
          },
        },
      );
    }, section);

    const resizeObserver = new ResizeObserver(() => ScrollTrigger.refresh());
    resizeObserver.observe(track);

    let cancelled = false;
    document.fonts?.ready.then(() => {
      if (!cancelled) ScrollTrigger.refresh();
    });

    return () => {
      cancelled = true;
      resizeObserver.disconnect();
      ctx.revert();
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      data-nav-theme="light"
      aria-label="Registre, compare e decida"
      className="relative overflow-hidden bg-sand py-16 text-graphite sm:py-20"
    >
      <div className="w-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain [scrollbar-width:none] sm:overflow-hidden [&::-webkit-scrollbar]:hidden">
        <div ref={trackRef} role="list" className="flex w-max will-change-transform">
          {WORDS.map((word, index) => (
            <div
              key={word}
              role="listitem"
              className={`w-[72vw] flex-none snap-start snap-always sm:w-[50vw] lg:w-[38vw] ${index > 0 ? "border-l border-graphite/15" : ""}`}
            >
              <div className="px-6 sm:px-8 lg:px-10">
                <div className="flex min-h-28 items-baseline gap-3 py-6 sm:flex-col sm:items-start sm:gap-2 sm:py-0">
                  <span className="font-mono text-xs text-olive">0{index + 1}</span>
                  <span className="font-display text-4xl font-semibold tracking-[-0.01em] sm:text-5xl">{word}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
