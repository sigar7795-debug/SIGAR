import { useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { BackgroundVideo } from "./BackgroundVideo";

gsap.registerPlugin(ScrollTrigger);

// Reveal points as fractions of the pinned scroll range (15% / 45% / 65% / 85%),
// each animating in over a short window that fully resolves before the next word
// starts — the last one ends exactly at 1 so timeline position === scroll fraction.
const WORDS: { key: "mais" | "controle" | "da" | "propriedade"; label: string; start: number; duration: number }[] = [
  { key: "mais", label: "MAIS", start: 0.15, duration: 0.08 },
  { key: "controle", label: "CONTROLE", start: 0.45, duration: 0.08 },
  { key: "da", label: "DA", start: 0.65, duration: 0.06 },
  { key: "propriedade", label: "PROPRIEDADE", start: 0.85, duration: 0.08 },
];

type WordKey = (typeof WORDS)[number]["key"];

const OFFICIAL_FONT = '"Barlow Condensed", ui-sans-serif, system-ui, sans-serif';
const SHUFFLE_INTERVAL_MS = 95;
const SHUFFLE_STYLES = [
  { fontFamily: "ui-serif, Georgia, Cambria, serif", fontStyle: "normal" },
  { fontFamily: 'ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace', fontStyle: "italic" },
  { fontFamily: '"Manrope", ui-sans-serif, system-ui, sans-serif', fontStyle: "normal" },
  { fontFamily: OFFICIAL_FONT, fontStyle: "oblique" },
  { fontFamily: "ui-serif, Georgia, Cambria, serif", fontStyle: "italic" },
  { fontFamily: 'ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace', fontStyle: "normal" },
] as const;

/**
 * Pinned, scroll-scrubbed reveal: "MAIS CONTROLE DA PROPRIEDADE" builds word by
 * word over a ~300vh scroll range while the landscape video keeps playing behind
 * it, then releases back into normal vertical scroll — the
 * "PAISAGEM → PROPRIEDADE" beat of the brief. `scrub: 1` ties the timeline
 * directly to (smoothed, via useSmoothScroll's Lenis→ScrollTrigger.update bridge)
 * scroll position, so scrolling back up reverses the reveal automatically —
 * no separate "scroll up" logic needed, that's what scrub does.
 */
export function ScrollRevealTransition() {
  const sectionRef = useRef<HTMLElement>(null);
  const wordRefs = {
    mais: useRef<HTMLSpanElement>(null),
    controle: useRef<HTMLSpanElement>(null),
    da: useRef<HTMLSpanElement>(null),
    propriedade: useRef<HTMLSpanElement>(null),
  };
  const [reduceMotion, setReduceMotion] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useLayoutEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const listener = (e: MediaQueryListEvent) => setReduceMotion(e.matches);
    query.addEventListener("change", listener);
    return () => query.removeEventListener("change", listener);
  }, []);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section || reduceMotion) return;

    let cleanupShuffle = () => {};
    const ctx = gsap.context(() => {
      const spans = WORDS.map(w => wordRefs[w.key].current).filter((el): el is HTMLSpanElement => Boolean(el));
      const shuffleTimeouts = new Map<WordKey, number[]>();
      const shuffledWords = new Set<WordKey>();

      const setFinalFont = (span: HTMLSpanElement) => {
        gsap.set(span, { fontFamily: OFFICIAL_FONT, fontStyle: "normal" });
      };

      const cancelShuffle = (key: WordKey) => {
        shuffleTimeouts.get(key)?.forEach(timeout => window.clearTimeout(timeout));
        shuffleTimeouts.delete(key);
        const span = wordRefs[key].current;
        if (span) setFinalFont(span);
      };

      const runShuffle = (key: WordKey) => {
        const span = wordRefs[key].current;
        if (!span) return;

        cancelShuffle(key);
        const timeouts: number[] = [];
        SHUFFLE_STYLES.forEach((style, index) => {
          const applyStyle = () => gsap.set(span, style);
          if (index === 0) applyStyle();
          else timeouts.push(window.setTimeout(applyStyle, index * SHUFFLE_INTERVAL_MS));
        });
        timeouts.push(
          window.setTimeout(() => {
            setFinalFont(span);
            shuffleTimeouts.delete(key);
          }, SHUFFLE_STYLES.length * SHUFFLE_INTERVAL_MS),
        );
        shuffleTimeouts.set(key, timeouts);
      };

      const lockWordDimensions = () => {
        spans.forEach(span => {
          gsap.set(span, {
            width: "auto",
            height: "auto",
            fontFamily: OFFICIAL_FONT,
            fontStyle: "normal",
          });
          const bounds = span.getBoundingClientRect();
          gsap.set(span, { width: Math.ceil(bounds.width), height: Math.ceil(bounds.height) });
        });
      };

      lockWordDimensions();
      gsap.set(spans, { opacity: 0, y: 24, filter: "blur(16px)" });
      ScrollTrigger.addEventListener("refreshInit", lockWordDimensions);

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: () => `+=${window.innerHeight * 3}`,
          pin: true,
          scrub: 1,
          invalidateOnRefresh: true,
          onUpdate: self => {
            WORDS.forEach(({ key, start }) => {
              if (self.direction > 0 && self.progress >= start && !shuffledWords.has(key)) {
                shuffledWords.add(key);
                runShuffle(key);
              } else if (self.direction < 0 && self.progress < start && shuffledWords.has(key)) {
                shuffledWords.delete(key);
                cancelShuffle(key);
              }
            });
          },
          onLeaveBack: () => {
            WORDS.forEach(({ key }) => {
              shuffledWords.delete(key);
              cancelShuffle(key);
            });
          },
        },
      });

      WORDS.forEach(({ key, start, duration }) => {
        tl.to(wordRefs[key].current, { opacity: 1, y: 0, filter: "blur(0px)", ease: "none", duration }, start);
      });
      // Pads the timeline to end exactly at 1 (PROPRIEDADE finishes at 0.93) so the
      // phrase holds complete for a beat before the pin releases.
      tl.set({}, {}, 1);

      cleanupShuffle = () => {
        ScrollTrigger.removeEventListener("refreshInit", lockWordDimensions);
        WORDS.forEach(({ key }) => cancelShuffle(key));
      };
    }, section);

    return () => {
      cleanupShuffle();
      ctx.revert();
    };
  }, [reduceMotion]);

  return (
    <section ref={sectionRef} data-nav-theme="dark" className="relative h-screen overflow-hidden bg-graphite">
      <BackgroundVideo
        poster={
          <img
            src="/media/sigar-reveal-poster.jpg"
            alt=""
            className="h-full w-full object-cover object-center"
          />
        }
        posterSrc="/media/sigar-reveal-poster.jpg"
        desktopSrc="/media/sigar-reveal.mp4"
        className="absolute inset-0"
      />
      <div className="absolute inset-0 bg-graphite/45" />

      <div className="relative flex h-full items-center justify-center px-6 sm:px-10 lg:px-16">
        <h2 className="flex max-w-4xl flex-wrap items-center justify-center gap-x-4 gap-y-2 text-center font-display text-5xl font-extrabold uppercase leading-[0.95] tracking-tight text-paper [text-shadow:0_4px_28px_rgba(22,28,25,0.65)] sm:text-6xl md:text-7xl lg:text-8xl">
          {WORDS.map(({ key, label }) => (
            <span key={key} className="shrink-0">
              <span ref={wordRefs[key]} data-shuffle-word={key} className="inline-block whitespace-nowrap">
                {label}
              </span>
            </span>
          ))}
        </h2>
      </div>
    </section>
  );
}
