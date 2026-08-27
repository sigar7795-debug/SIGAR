import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useViewTransitionNavigate } from "@/hooks/useViewTransitionNavigate";
import { Link } from "wouter";
import { BackgroundVideo } from "./BackgroundVideo";
import { TransitionStrip } from "./TransitionStrip";

export function Hero() {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useViewTransitionNavigate();

  return (
    <section
      id="top"
      className="relative flex min-h-svh w-full flex-col bg-graphite text-paper"
    >
      {/* Layer 1 — video, position:absolute + inset:0, fills the section (100vw, min 100vh via the section) */}
      <BackgroundVideo
        poster={
          <img
            src="/media/sigar-hero-poster.jpg"
            alt=""
            className="h-full w-full object-cover object-center brightness-75"
          />
        }
        posterSrc="/media/sigar-hero-poster.jpg"
        desktopSrc="/media/sigar-hero.mp4"
        videoClassName="brightness-75"
        className="absolute inset-0 z-0 [view-transition-name:rural-media]"
      >
        {/* Layer 2 — dark scrim: stronger low, behind the title/text, fading to clear video up top */}
        <div className="absolute inset-0 z-[1] bg-gradient-to-t from-graphite/70 via-graphite/20 to-transparent" />
        {/* Faint technical grid, kept low so it never competes with the wordmark */}
        <div
          className="absolute inset-0 z-[1] opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(231,227,217,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(231,227,217,0.5) 1px, transparent 1px)",
            backgroundSize: "72px 72px",
          }}
        />
      </BackgroundVideo>

      {/* Layer 3 — content, overlaid on the video, anchored to the bottom of the fold */}
      <div className="relative z-20 flex flex-1 flex-col justify-end gap-8 px-6 pb-10 sm:px-10 sm:pb-12 sm:gap-10 lg:px-16 lg:pb-14">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
          {/* SIGAR + CTA — bottom-left */}
          <div>
            <h1 className="w-fit font-display text-7xl font-extrabold uppercase leading-[0.85] tracking-tight text-paper [text-shadow:0_4px_28px_rgba(22,28,25,0.6)] [view-transition-name:sigar-wordmark] sm:text-8xl md:text-[clamp(6rem,12vw,9rem)] lg:text-[clamp(7rem,15vw,15rem)]">
              SIGAR
            </h1>

            <div className="mt-6 sm:mt-8">
              {loading ? (
                <div className="h-14 w-60 animate-pulse rounded-none bg-sage/15" />
              ) : isAuthenticated ? (
                <Button
                  asChild
                  size="lg"
                  className="group relative h-14 min-w-60 overflow-hidden rounded-none border border-paper bg-transparent px-7 text-base font-semibold text-paper"
                >
                  <Link href="/dashboard">
                    <span className="absolute inset-0 origin-bottom scale-y-0 bg-sage transition-transform duration-300 ease-out group-hover:scale-y-100" />
                    <span className="relative z-10 transition-colors duration-300 group-hover:text-graphite">
                      Acessar painel
                    </span>
                  </Link>
                </Button>
              ) : (
                <Button
                  size="lg"
                  onClick={() => navigate("/login")}
                  className="group relative h-14 min-w-60 overflow-hidden rounded-none border border-paper bg-transparent px-7 text-base font-semibold text-paper"
                >
                  <span className="absolute inset-0 origin-bottom scale-y-0 bg-sage transition-transform duration-300 ease-out group-hover:scale-y-100" />
                  <span className="relative z-10 transition-colors duration-300 group-hover:text-graphite">
                    Entrar na plataforma
                  </span>
                </Button>
              )}
            </div>
          </div>

          {/* Supporting copy — bottom-right */}
          <div className="max-w-sm lg:text-right">
            <p className="text-lg font-medium leading-snug text-sage [text-shadow:0_2px_10px_rgba(22,28,25,0.65)] sm:text-xl">
              Sistema integrado de gestão e administração rural
            </p>
            <p className="mt-2 text-base leading-relaxed text-sand/90 [text-shadow:0_2px_10px_rgba(22,28,25,0.55)] sm:text-lg">
              Dados da propriedade à decisão.
            </p>
          </div>
        </div>

        {/* "Produzir, Registrar, Comparar, Decidir" — small overlaid indicators, not a solid band */}
        <TransitionStrip />
      </div>
    </section>
  );
}
