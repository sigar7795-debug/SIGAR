# Landing media — status

`Hero` uses real footage: `client/public/media/sigar-hero.mp4` + `sigar-hero-poster.jpg`,
sourced from the licensed clip at `rural_zones/12165164_3840_2160_24fps.mp4`. `VideoBreakSection`
and `FinalCtaSection` are untouched and still render their `FieldScene` placeholder (a stylised
SVG contour illustration, not a photo). See `FieldScene.tsx` and `BackgroundVideo.tsx`.

Both files under `client/public/media/` are **local-dev-only and gitignored** — production is
expected to serve them from external storage (CDN/object storage) via URLs, not from this repo.
The 4K source in `rural_zones/` is gitignored too and must never be committed.

## Known gap — video not yet optimized

FFmpeg wasn't available in the environment that produced this build, so `sigar-hero.mp4` is
currently the **raw 4K source copied as-is** (~230MB, no re-encode) rather than the spec'd
web-optimized file (H.264, ≤1920×1080, 24fps, muted, 12–20s loop, <8MB). Likewise,
`sigar-hero-poster.jpg` was extracted via a Windows Shell thumbnail (not ffmpeg), so it's a
JPEG rather than the spec'd WebP. Before shipping this to production:

1. Re-encode with ffmpeg per the brief: desktop MP4 H.264 ≤1920×1080 @24fps, 12–20s loop,
   muted, faststart, <8MB. Produce a `sigar-hero-poster.webp` (<500KB) alongside it.
2. Produce a dedicated mobile file (not just a crop of the desktop file), <4MB, and pass it
   as `mobileSrc` on the `Hero`'s `<BackgroundVideo>` call — until then, `BackgroundVideo`
   deliberately shows the poster on mobile viewports instead of the desktop video.
3. Update the `src`/`posterSrc` paths in `Hero.tsx` if filenames change, and swap the
   `.jpg` poster reference to `.webp` if you regenerate it.

`BackgroundVideo` already handles autoplay/muted/loop/playsInline, in-view play/pause,
`prefers-reduced-motion`, `navigator.connection.saveData`, and the mobile-without-mobile-source
fallback — no component changes should be needed to swap in the optimized files.

## To replace a placeholder poster with real photography

For sections still on `FieldScene` (`VideoBreakSection`, `FinalCtaSection`), swap the
`<FieldScene variant="..." />` passed as `poster` for an `<img>` (AVIF/WebP, with a `loading`
strategy appropriate to the section) once you have licensed stills.
