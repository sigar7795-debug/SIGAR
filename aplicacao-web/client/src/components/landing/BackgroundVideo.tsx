import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

type SaveDataConnection = { saveData?: boolean };

/**
 * Full-bleed hero/section media. Renders a poster (real photography once available,
 * `FieldScene` placeholder until then) and — only when real sources are supplied —
 * layers a muted, looping <video> on top once it scrolls into view.
 *
 * `desktopSrc`/`mobileSrc` are left undefined for sections without real footage yet,
 * so those instances render the poster only. Where only `desktopSrc` is supplied
 * (no dedicated mobile-optimized file), narrow viewports fall back to the poster
 * too, since the desktop source isn't appropriate to ship to mobile.
 */
export function BackgroundVideo({
  poster,
  posterSrc,
  desktopSrc,
  mobileSrc,
  navTheme,
  className = "",
  videoClassName = "",
  children,
}: {
  /** Poster shown always, and used as the sole visual when video is unavailable/disabled. */
  poster: ReactNode;
  /** Same image as `poster`, as a URL — set as the native <video poster> attribute. */
  posterSrc?: string;
  desktopSrc?: string;
  mobileSrc?: string;
  /** Sets `data-nav-theme` on the root, for LandingHeader's section-color detection. */
  navTheme?: "light" | "dark";
  className?: string;
  /** Extra classes appended to the <video> element itself, e.g. a brightness filter. */
  videoClassName?: string;
  children?: ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [inView, setInView] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const canUseVideo = Boolean(desktopSrc || mobileSrc);

  useEffect(() => {
    if (!canUseVideo) return;
    const node = containerRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.15 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [canUseVideo]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (inView) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [inView, videoReady]);

  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const saveData =
    typeof navigator !== "undefined" &&
    Boolean((navigator as Navigator & { connection?: SaveDataConnection }).connection?.saveData);
  const isMobileViewport =
    typeof window !== "undefined" && window.matchMedia?.("(max-width: 767px)").matches;
  // Without a dedicated mobile file, the desktop source isn't fit to ship to mobile —
  // fall back to the poster there until a mobile-optimized version exists.
  const hasSrcForViewport = isMobileViewport ? Boolean(mobileSrc) : Boolean(desktopSrc);
  const shouldRenderVideo = canUseVideo && hasSrcForViewport && !reduceMotion && !saveData;

  return (
    // Positioning (relative/absolute) is the caller's responsibility via `className` —
    // hardcoding `relative` here previously fought callers passing `absolute inset-0`
    // (e.g. Hero's full-bleed layer): same-specificity Tailwind utilities are decided
    // by declaration order in the compiled stylesheet, not by className string order,
    // so `relative` silently won and collapsed the absolutely-positioned children to 0 height.
    <div ref={containerRef} data-nav-theme={navTheme} className={`overflow-hidden ${className}`}>
      <div className="absolute inset-0">{poster}</div>
      {shouldRenderVideo && (
        <video
          ref={videoRef}
          className={`absolute inset-0 h-full w-full object-cover object-center ${videoClassName}`}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={posterSrc}
          onCanPlay={() => setVideoReady(true)}
          onError={() => setVideoReady(false)}
          style={{ opacity: videoReady ? 1 : 0, transition: "opacity 600ms ease-out" }}
        >
          {mobileSrc && <source src={mobileSrc} media="(max-width: 767px)" type="video/mp4" />}
          {desktopSrc && <source src={desktopSrc} type="video/mp4" />}
        </video>
      )}
      {children}
    </div>
  );
}
