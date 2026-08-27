import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { BookOpen, Briefcase, Compass, GraduationCap, Sprout } from "lucide-react";

const AUDIENCES = [
  {
    number: "01",
    icon: Sprout,
    title: "PRODUTORES RURAIS",
    description: "Registre a rotina da propriedade.",
    video: "/media/personas/produtor-rural.mp4",
    poster: "/media/sigar-hero-poster.jpg",
    videoLabel: "Rotina e trabalho de produtores rurais no campo",
    objectPosition: "center",
  },
  {
    number: "02",
    icon: Briefcase,
    title: "GESTORES",
    description: "Acompanhe custos e resultados.",
    video: "/media/personas/gestor.mp4",
    poster: "/media/sigar-reveal-poster.jpg",
    videoLabel: "Gestão e acompanhamento de resultados da propriedade",
    objectPosition: "center 42%",
  },
  {
    number: "03",
    icon: GraduationCap,
    title: "ESTUDANTES",
    description: "Transforme dados em aprendizado.",
    video: "/media/personas/estudante.mp4",
    poster: "/media/sigar-hero-poster.jpg",
    videoLabel: "Aprendizado e observação da atividade rural",
    objectPosition: "42% center",
  },
  {
    number: "04",
    icon: Compass,
    title: "CONSULTORES",
    description: "Compare cenários e oriente decisões.",
    video: "/media/personas/consultor.mp4",
    poster: "/media/sigar-reveal-poster.jpg",
    videoLabel: "Análise e orientação técnica na propriedade rural",
    objectPosition: "58% center",
  },
  {
    number: "05",
    icon: BookOpen,
    title: "PROFESSORES",
    description: "Leve a gestão rural para a sala de aula.",
    video: "/media/personas/professor.mp4",
    poster: "/media/sigar-hero-poster.jpg",
    videoLabel: "Conteúdo de gestão rural aplicado ao ensino",
    objectPosition: "right center",
  },
] as const;

type LayerIndex = 0 | 1;
type PreviewLayers = [number | null, number | null];

const PREVIEW_WIDTH = 280;
const PREVIEW_HEIGHT = 158;
const CURSOR_OFFSET = 24;
const VIEWPORT_MARGIN = 12;

export function AudiencesSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const cursorDotRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<Array<HTMLVideoElement | null>>([null, null]);
  const activeLayerRef = useRef<LayerIndex>(0);
  const frameRef = useRef<number | null>(null);
  const targetPosition = useRef({ x: 0, y: 0 });
  const currentPosition = useRef({ x: 0, y: 0 });

  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [activeLayer, setActiveLayer] = useState<LayerIndex>(0);
  const [previewLayers, setPreviewLayers] = useState<PreviewLayers>([null, null]);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [cursorDotVisible, setCursorDotVisible] = useState(false);
  const [hoverCapable, setHoverCapable] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const hoverQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncPreferences = () => {
      setHoverCapable(hoverQuery.matches);
      setReduceMotion(motionQuery.matches);
    };

    syncPreferences();
    hoverQuery.addEventListener("change", syncPreferences);
    motionQuery.addEventListener("change", syncPreferences);
    return () => {
      hoverQuery.removeEventListener("change", syncPreferences);
      motionQuery.removeEventListener("change", syncPreferences);
    };
  }, []);

  useEffect(() => {
    const activeVideo = videoRefs.current[activeLayer];
    const inactiveLayer: LayerIndex = activeLayer === 0 ? 1 : 0;
    const inactiveVideo = videoRefs.current[inactiveLayer];

    if (previewVisible && hoverCapable && !reduceMotion) {
      activeVideo?.play().catch(() => {});
      const pauseTimer = window.setTimeout(() => {
        if (inactiveVideo) {
          inactiveVideo.pause();
          inactiveVideo.currentTime = 0;
        }
      }, 220);
      return () => window.clearTimeout(pauseTimer);
    }

    const hideTimer = window.setTimeout(() => {
      videoRefs.current.forEach(video => {
        if (!video) return;
        video.pause();
        video.currentTime = 0;
      });
    }, 220);
    return () => window.clearTimeout(hideTimer);
  }, [activeLayer, hoverCapable, previewLayers, previewVisible, reduceMotion]);

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
      videoRefs.current.forEach(video => video?.pause());
    };
  }, []);

  const renderPreviewPosition = () => {
    const preview = previewRef.current;
    if (!preview) {
      frameRef.current = null;
      return;
    }

    const current = currentPosition.current;
    const target = targetPosition.current;
    current.x += (target.x - current.x) * 0.24;
    current.y += (target.y - current.y) * 0.24;
    preview.style.transform = `translate3d(${current.x}px, ${current.y}px, 0)`;

    if (Math.abs(target.x - current.x) > 0.2 || Math.abs(target.y - current.y) > 0.2) {
      frameRef.current = window.requestAnimationFrame(renderPreviewPosition);
    } else {
      current.x = target.x;
      current.y = target.y;
      preview.style.transform = `translate3d(${target.x}px, ${target.y}px, 0)`;
      frameRef.current = null;
    }
  };

  const updatePreviewPosition = (clientX: number, clientY: number, immediate = false) => {
    let x = clientX + CURSOR_OFFSET;
    let y = clientY + CURSOR_OFFSET;

    if (x + PREVIEW_WIDTH > window.innerWidth - VIEWPORT_MARGIN) {
      x = clientX - PREVIEW_WIDTH - CURSOR_OFFSET;
    }
    if (y + PREVIEW_HEIGHT > window.innerHeight - VIEWPORT_MARGIN) {
      y = clientY - PREVIEW_HEIGHT - CURSOR_OFFSET;
    }

    x = Math.max(VIEWPORT_MARGIN, Math.min(x, window.innerWidth - PREVIEW_WIDTH - VIEWPORT_MARGIN));
    y = Math.max(VIEWPORT_MARGIN, Math.min(y, window.innerHeight - PREVIEW_HEIGHT - VIEWPORT_MARGIN));
    targetPosition.current = { x, y };

    if (immediate) {
      currentPosition.current = { x, y };
      if (previewRef.current) previewRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    }
    if (frameRef.current === null) frameRef.current = window.requestAnimationFrame(renderPreviewPosition);
  };

  const updateCursorDotPosition = (clientX: number, clientY: number) => {
    if (!cursorDotRef.current) return;
    cursorDotRef.current.style.transform = `translate3d(${clientX}px, ${clientY}px, 0) translate(-50%, -50%)`;
  };

  const showCursorPreview = (index: number, event: ReactPointerEvent<HTMLButtonElement>) => {
    setActiveIndex(index);
    if (!hoverCapable || reduceMotion || event.pointerType === "touch") return;

    updateCursorDotPosition(event.clientX, event.clientY);
    setCursorDotVisible(true);

    const nextLayer: LayerIndex = activeLayerRef.current === 0 ? 1 : 0;
    setPreviewLayers(current => {
      const next: PreviewLayers = [...current];
      next[nextLayer] = index;
      return next;
    });
    activeLayerRef.current = nextLayer;
    setActiveLayer(nextLayer);
    updatePreviewPosition(event.clientX, event.clientY, !previewVisible);
    setPreviewVisible(true);
  };

  const hideCursorPreview = () => {
    setPreviewVisible(false);
    setCursorDotVisible(false);
    if (!sectionRef.current?.contains(document.activeElement)) setActiveIndex(null);
  };

  return (
    <section
      ref={sectionRef}
      id="para-quem"
      data-nav-theme="light"
      className="overflow-hidden bg-sand py-16 text-graphite sm:py-20 lg:py-24"
      onPointerLeave={hideCursorPreview}
    >
      <div className="mx-auto w-full max-w-[1600px] px-6 sm:px-10 lg:px-16">
        <div className="flex items-start justify-between gap-8">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.24em] text-olive">Para quem</p>
          <p className="text-right font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-olive sm:text-[11px]">
            05 perfis · 01 plataforma
          </p>
        </div>

        <h2 className="mt-5 max-w-5xl font-display text-5xl font-semibold leading-[0.92] tracking-[-0.01em] sm:text-6xl lg:text-7xl">
          Pensado para quem cuida da propriedade todos os dias.
        </h2>

        <div className="mt-9 flex snap-x snap-mandatory overflow-x-auto border-y border-olive/45 [scrollbar-width:none] md:overflow-visible [&::-webkit-scrollbar]:hidden">
          {AUDIENCES.map((audience, index) => {
            const isActive = activeIndex === index;
            const showInlineMedia = isActive && (!hoverCapable || reduceMotion);
            const Icon = audience.icon;

            return (
              <button
                key={audience.title}
                type="button"
                aria-pressed={isActive}
                aria-label={`${audience.title}. ${audience.description}`}
                className={`group min-h-[360px] w-[82vw] min-w-0 flex-none snap-start border-r border-olive/45 px-5 py-6 text-left outline-none transition-[flex-grow,background-color,color] duration-300 first:border-l focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-olive sm:w-[52vw] sm:px-6 md:w-auto md:flex-1 lg:min-h-[390px] lg:px-7 ${
                  hoverCapable && !reduceMotion ? "cursor-none" : "cursor-default"
                } ${
                  isActive ? "bg-field text-sand md:flex-[1.12]" : "bg-sand text-graphite"
                }`}
                onPointerEnter={event => showCursorPreview(index, event)}
                onPointerMove={event => {
                  if (hoverCapable && event.pointerType !== "touch") {
                    updateCursorDotPosition(event.clientX, event.clientY);
                    if (!cursorDotVisible) setCursorDotVisible(true);
                  }
                  if (previewVisible && hoverCapable && !reduceMotion) {
                    updatePreviewPosition(event.clientX, event.clientY);
                  }
                }}
                onPointerLeave={() => setCursorDotVisible(false)}
                onPointerCancel={() => setCursorDotVisible(false)}
                onFocus={() => setActiveIndex(index)}
                onBlur={event => {
                  if (!event.currentTarget.matches(":hover")) setActiveIndex(null);
                }}
                onClick={() => {
                  if (!hoverCapable) setActiveIndex(index);
                }}
              >
                <div className="flex h-full min-h-[310px] flex-col lg:min-h-[340px]">
                  <div className="flex items-start justify-between gap-4">
                    <span
                      className={`font-mono text-xs transition-all duration-300 ${
                        isActive ? "translate-y-0 text-sand" : "translate-y-1 text-olive"
                      }`}
                    >
                      {audience.number}
                    </span>
                    <Icon
                      aria-hidden="true"
                      strokeWidth={1.5}
                      className={`h-5 w-5 transition-all delay-[35ms] duration-300 ${
                        isActive ? "translate-y-0 text-sand" : "translate-y-1 text-olive"
                      }`}
                    />
                  </div>

                  <h3
                    className={`mt-10 font-display text-3xl font-bold leading-[0.95] transition-all delay-[70ms] duration-300 lg:text-4xl ${
                      isActive ? "translate-y-0 text-sand" : "translate-y-1 text-graphite"
                    }`}
                  >
                    {audience.title}
                  </h3>

                  <div
                    className={`mt-6 h-px w-full origin-left transition-all delay-100 duration-300 ${
                      isActive ? "scale-x-100 bg-sand/55" : "scale-x-90 bg-olive/45"
                    }`}
                  />

                  {showInlineMedia && (
                    <div className="mt-5 aspect-video w-full overflow-hidden border border-olive/45">
                      {reduceMotion ? (
                        <img
                          src={audience.poster}
                          alt={audience.videoLabel}
                          className="h-full w-full object-cover"
                          style={{ objectPosition: audience.objectPosition }}
                        />
                      ) : (
                        <video
                          aria-label={audience.videoLabel}
                          src={audience.video}
                          poster={audience.poster}
                          muted
                          loop
                          autoPlay
                          playsInline
                          preload="metadata"
                          className="h-full w-full object-cover"
                          style={{ objectPosition: audience.objectPosition }}
                        />
                      )}
                    </div>
                  )}

                  <p
                    className={`mt-auto max-w-[18rem] pt-8 text-sm leading-relaxed transition-all delay-150 duration-300 ${
                      isActive ? "translate-y-0 text-sand" : "translate-y-1 text-graphite/70"
                    }`}
                  >
                    {audience.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div
        ref={previewRef}
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 z-[90] hidden w-[280px] md:block"
      >
        <div
          className={`relative aspect-video w-full overflow-hidden border border-sand/30 bg-graphite transition-[opacity,scale] duration-200 ${
            previewVisible && hoverCapable && !reduceMotion ? "scale-100 opacity-100" : "scale-90 opacity-0"
          }`}
        >
          {previewLayers.map((audienceIndex, layer) => {
            const audience = audienceIndex === null ? null : AUDIENCES[audienceIndex];
            if (!audience) return null;
            const layerIndex = layer as LayerIndex;

            return (
              <video
                key={`${layer}-${audience.title}`}
                ref={video => {
                  videoRefs.current[layerIndex] = video;
                }}
                aria-label={audience.videoLabel}
                src={audience.video}
                poster={audience.poster}
                muted
                loop
                autoPlay={previewVisible && activeLayer === layerIndex}
                playsInline
                preload="metadata"
                className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-200 ${
                  previewVisible && activeLayer === layerIndex ? "opacity-100" : "opacity-0"
                }`}
                style={{ objectPosition: audience.objectPosition }}
              />
            );
          })}
        </div>
      </div>

      <div
        ref={cursorDotRef}
        aria-hidden="true"
        className={`pointer-events-none fixed left-0 top-0 z-[100] hidden h-3 w-3 rounded-full border border-field bg-sand transition-opacity duration-150 md:block ${
          cursorDotVisible && hoverCapable ? "opacity-100" : "opacity-0"
        }`}
      />
    </section>
  );
}
