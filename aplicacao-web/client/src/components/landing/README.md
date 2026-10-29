# Landing media — status

`Hero` uses production-ready real footage: `sigar-hero-web.mp4` for desktop,
`sigar-hero-mobile.mp4` for mobile and `sigar-hero-poster.jpg` as its fallback,
sourced from the licensed clip at `rural_zones/12165164_3840_2160_24fps.mp4`. `VideoBreakSection`
and `FinalCtaSection` are untouched and still render their `FieldScene` placeholder (a stylised
SVG contour illustration, not a photo). See `FieldScene.tsx` and `BackgroundVideo.tsx`.

The shipped clips are muted H.264 MP4 files with fast-start metadata: desktop is 1080p and
about 6 MB; mobile is 720p and about 2.4 MB. The raw 4K source remains local-only and ignored.

`BackgroundVideo` already handles autoplay/muted/loop/playsInline, in-view play/pause,
`prefers-reduced-motion`, `navigator.connection.saveData`, and the mobile-without-mobile-source
fallback — no component changes should be needed to swap in the optimized files.

## To replace a placeholder poster with real photography

For sections still on `FieldScene` (`VideoBreakSection`, `FinalCtaSection`), swap the
`<FieldScene variant="..." />` passed as `poster` for an `<img>` (AVIF/WebP, with a `loading`
strategy appropriate to the section) once you have licensed stills.
