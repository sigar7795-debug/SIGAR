import { useAuth } from "@/_core/hooks/useAuth";
import { BackgroundVideo } from "@/components/landing/BackgroundVideo";
import {
  supportsRouteViewTransitions,
  useViewTransitionNavigate,
} from "@/hooks/useViewTransitionNavigate";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, ArrowRight, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const FALLBACK_EXIT_MS = 650;

export default function LoginPage() {
  const navigate = useViewTransitionNavigate();
  const { isAuthenticated, loading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const exitTimerRef = useRef<number | null>(null);
  const utils = trpc.useUtils();
  const login = trpc.auth.login.useMutation({
    onSuccess: user => {
      utils.auth.me.setData(undefined, user);
      toast.success("Acesso realizado com segurança.");
      navigate("/dashboard");
    },
    onError: error => toast.error(error.message),
  });
  const signUp = trpc.auth.signUp.useMutation({
    onSuccess: result => {
      if (result.requiresEmailConfirmation) {
        toast.success("Conta criada. Confirme o e-mail para entrar no SIGAR.");
        setIsSignUp(false);
        return;
      }
      if (result.authenticated) {
        utils.auth.me.setData(undefined, result.user);
        toast.success("Conta criada com sucesso.");
        navigate("/dashboard");
      }
    },
    onError: error => toast.error(error.message),
  });

  useEffect(() => {
    if (!loading && isAuthenticated) navigate("/dashboard");
  }, [isAuthenticated, loading, navigate]);

  useEffect(() => {
    return () => {
      if (exitTimerRef.current !== null)
        window.clearTimeout(exitTimerRef.current);
    };
  }, []);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    if (!email || !password || (isSignUp && !name)) {
      toast.error("Preencha os dados obrigatórios para continuar.");
      return;
    }
    if (isSignUp) {
      signUp.mutate({ name, email, password, remember });
      return;
    }
    login.mutate({ email, password, remember });
  };

  const isSubmitting = login.isPending || signUp.isPending;

  const handleBack = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    if (
      supportsRouteViewTransitions() ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      navigate("/");
      return;
    }

    setIsLeaving(true);
    exitTimerRef.current = window.setTimeout(
      () => navigate("/"),
      FALLBACK_EXIT_MS
    );
  };

  return (
    <main
      className={`login-page min-h-svh w-full overflow-x-hidden bg-sand text-graphite md:h-svh md:overflow-hidden ${
        isLeaving ? "login-page-leave" : "login-page-enter"
      }`}
    >
      <div className="grid min-h-svh w-full grid-cols-1 md:h-svh md:grid-cols-2 lg:grid-cols-[minmax(0,62fr)_minmax(380px,38fr)]">
        <section
          aria-label="Paisagem rural do SIGAR"
          className="relative h-[35svh] min-h-[240px] overflow-hidden bg-graphite text-paper md:h-svh"
        >
          <BackgroundVideo
            poster={
              <img
                src="/media/sigar-reveal-poster.jpg"
                alt="Paisagem rural com gado"
                className="h-full w-full object-cover object-center"
              />
            }
            posterSrc="/media/sigar-reveal-poster.jpg"
            desktopSrc="/media/sigar-reveal.mp4"
            mobileSrc="/media/sigar-reveal.mp4"
            className="absolute inset-0 [view-transition-name:rural-media]"
          >
            <div className="absolute inset-0 bg-graphite/45" />
          </BackgroundVideo>

          <a
            href="/"
            onClick={handleBack}
            className="absolute left-6 top-6 z-20 inline-flex items-center gap-2 text-xs font-semibold text-paper transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-paper sm:left-10 sm:top-8 lg:left-12"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Voltar ao site
          </a>

          <div className="absolute inset-x-6 bottom-7 z-20 sm:inset-x-10 sm:bottom-10 lg:inset-x-12 lg:bottom-12">
            <h1 className="w-fit font-display text-7xl font-extrabold uppercase leading-none text-paper [view-transition-name:sigar-wordmark] sm:text-8xl lg:text-9xl">
              SIGAR
            </h1>
            <p className="mt-3 max-w-md text-sm font-medium leading-relaxed text-paper/85 sm:text-base">
              Sistema integrado de gestão e administração rural
            </p>
          </div>
        </section>

        <section
          className={`login-panel flex min-h-[65svh] flex-col overflow-y-auto bg-sand px-6 py-8 [view-transition-name:login-panel] sm:px-10 sm:py-10 md:h-svh md:min-h-0 lg:px-12 ${
            isLeaving ? "login-panel-leave" : "login-panel-enter"
          }`}
        >
          <div className="flex items-center justify-between gap-5">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-olive">
              Acesso à plataforma
            </p>
            <p className="inline-flex items-center gap-2 whitespace-nowrap font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-field">
              <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5" />
              Autenticação segura
            </p>
          </div>

          <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-12 sm:py-14 md:py-10">
            <header>
              <h2 className="font-display text-5xl font-bold leading-none text-graphite sm:text-6xl">
                {isSignUp ? "Crie sua conta." : "Entre no SIGAR."}
              </h2>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-graphite/65 sm:text-base">
                {isSignUp
                  ? "Comece a organizar os dados da sua propriedade."
                  : "Acesse os dados e a gestão da sua propriedade."}
              </p>
            </header>

            <form className="mt-10 space-y-7" onSubmit={handleSubmit}>
              {isSignUp ? (
                <label className="block" htmlFor="login-name">
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-olive">
                    Nome completo
                  </span>
                  <span className="relative mt-2 block">
                    <input
                      id="login-name"
                      name="name"
                      type="text"
                      required
                      autoComplete="name"
                      className="peer h-11 w-full border-0 border-b border-olive/45 bg-transparent px-0 text-base text-graphite outline-none placeholder:text-graphite/30 focus-visible:outline-none"
                    />
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-0 bottom-0 h-px origin-left scale-x-0 bg-field transition-transform duration-300 ease-out peer-focus:scale-x-100"
                    />
                  </span>
                </label>
              ) : null}
              <label className="block" htmlFor="login-email">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-olive">
                  E-mail
                </span>
                <span className="relative mt-2 block">
                  <input
                    id="login-email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    className="peer h-11 w-full border-0 border-b border-olive/45 bg-transparent px-0 text-base text-graphite outline-none placeholder:text-graphite/30 focus-visible:outline-none"
                  />
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-0 h-px origin-left scale-x-0 bg-field transition-transform duration-300 ease-out peer-focus:scale-x-100"
                  />
                </span>
              </label>

              <label className="block" htmlFor="login-password">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-olive">
                  Senha
                </span>
                <span className="relative mt-2 block">
                  <input
                    id="login-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={8}
                    autoComplete="current-password"
                    className="peer h-11 w-full border-0 border-b border-olive/45 bg-transparent px-0 pr-11 text-base text-graphite outline-none placeholder:text-graphite/30 focus-visible:outline-none"
                  />
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-0 h-px origin-left scale-x-0 bg-field transition-transform duration-300 ease-out peer-focus:scale-x-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(current => !current)}
                    aria-label={
                      showPassword ? "Ocultar senha" : "Mostrar senha"
                    }
                    title={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    className="absolute bottom-2 right-0 grid h-8 w-8 place-items-center text-olive transition-colors hover:text-field focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-field"
                  >
                    {showPassword ? (
                      <EyeOff aria-hidden="true" className="h-4 w-4" />
                    ) : (
                      <Eye aria-hidden="true" className="h-4 w-4" />
                    )}
                  </button>
                </span>
              </label>

              <div className="flex flex-wrap items-center justify-between gap-4 text-xs">
                <label className="inline-flex cursor-pointer items-center gap-2.5 text-graphite/70">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={event => setRemember(event.target.checked)}
                    className="h-4 w-4 rounded-none border-olive accent-field focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-field"
                  />
                  Manter conectado
                </label>
                <button
                  type="button"
                  onClick={() =>
                    toast.info(
                      "Solicite a redefinição de senha ao administrador do SIGAR."
                    )
                  }
                  className="font-semibold text-field underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-field"
                >
                  Esqueci minha senha
                </button>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="group relative flex h-13 w-full items-center justify-between overflow-hidden border border-field bg-field px-5 text-left font-semibold text-sand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-field focus-visible:ring-offset-2 focus-visible:ring-offset-sand"
              >
                <span className="absolute inset-0 origin-left scale-x-0 bg-paper transition-transform duration-300 ease-out group-hover:scale-x-100 group-focus-visible:scale-x-100" />
                <span className="relative z-10 transition-colors duration-300 group-hover:text-field group-focus-visible:text-field">
                  {isSubmitting
                    ? "Aguarde..."
                    : isSignUp
                      ? "Criar conta"
                      : "Entrar"}
                </span>
                <ArrowRight
                  aria-hidden="true"
                  className="relative z-10 h-4 w-4 transition-colors duration-300 group-hover:text-field group-focus-visible:text-field"
                />
              </button>
            </form>

            <p className="mt-7 text-sm text-graphite/60">
              {isSignUp ? "Já possui uma conta?" : "Ainda não possui acesso?"}{" "}
              <button
                type="button"
                onClick={() => setIsSignUp(current => !current)}
                className="font-semibold text-field underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-field"
              >
                {isSignUp ? "Entrar" : "Criar conta"}
              </button>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
