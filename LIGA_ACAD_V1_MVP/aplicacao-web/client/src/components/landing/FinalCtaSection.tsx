import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useViewTransitionNavigate } from "@/hooks/useViewTransitionNavigate";
import { Link } from "wouter";
import { BackgroundVideo } from "./BackgroundVideo";
import { FieldScene } from "./FieldScene";

export function FinalCtaSection() {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useViewTransitionNavigate();

  return (
    <BackgroundVideo
      poster={<FieldScene variant="ridge" />}
      navTheme="dark"
      className="relative flex min-h-[70vh] items-center justify-center py-24 text-paper"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-graphite/80 via-graphite/55 to-graphite/85" />
      <div className="container relative px-6 text-center sm:px-10 lg:px-16">
        <h2 className="mx-auto max-w-2xl font-display text-4xl font-semibold leading-tight tracking-[-0.01em] sm:text-5xl">
          Mais clareza para cuidar do que você produz.
        </h2>
        <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-paper/75 sm:text-base">
          Centralize as informações da propriedade e acompanhe os resultados com segurança.
        </p>
        <div className="mt-9">
          {loading ? (
            <div className="mx-auto h-12 w-56 animate-pulse rounded-md bg-sage/15" />
          ) : isAuthenticated ? (
            <Button asChild size="lg" className="h-12 min-w-56 bg-sand px-8 font-semibold text-graphite hover:bg-paper">
              <Link href="/dashboard">Acessar painel</Link>
            </Button>
          ) : (
            <Button size="lg" onClick={() => navigate("/login")} className="h-12 min-w-56 bg-sand px-8 font-semibold text-graphite hover:bg-paper">
              Entrar no SIGAR
            </Button>
          )}
        </div>
      </div>
    </BackgroundVideo>
  );
}
