import { AuthField } from "@/components/auth/AuthField";
import { BackgroundVideo } from "@/components/landing/BackgroundVideo";
import { useViewTransitionNavigate } from "@/hooks/useViewTransitionNavigate";
import { trpc } from "@/lib/trpc";
import {
  getNewPasswordError,
  getPasswordConfirmationError,
  PASSWORD_MIN_LENGTH,
} from "@shared/passwordPolicy";
import { ArrowLeft, ArrowRight, LoaderCircle, ShieldCheck } from "lucide-react";
import { type FormEvent, type ReactNode, useEffect, useState } from "react";
import { toast } from "sonner";

const EXPIRED_LINK_MESSAGE =
  "O link de redefinição expirou. Solicite um novo link.";
const INVALID_LINK_MESSAGE =
  "O link de redefinição é inválido ou já foi utilizado. Solicite um novo link.";
const MISSING_LINK_MESSAGE =
  "Abra esta página pelo link enviado ao seu e-mail ou solicite um novo link.";
const CONNECTION_MESSAGE =
  "Não foi possível falar com o servidor. Verifique sua conexão e tente novamente.";

type RecoveryLink =
  | { tokens: { accessToken: string; refreshToken: string } }
  | { error: string };

type ResetStatus =
  | { status: "checking" }
  | { status: "invalid"; message: string; retryable?: boolean }
  | { status: "ready" }
  | { status: "done" };

/** Lê o retorno do Supabase: tokens no fragmento (#) ou o erro do link. */
function readRecoveryLink(): RecoveryLink {
  const hash = new URLSearchParams(window.location.hash.slice(1));
  const query = new URLSearchParams(window.location.search);
  const errorCode = hash.get("error_code") ?? query.get("error_code");
  if (errorCode || hash.get("error") || query.get("error")) {
    return {
      error:
        errorCode === "otp_expired"
          ? EXPIRED_LINK_MESSAGE
          : INVALID_LINK_MESSAGE,
    };
  }

  const accessToken = hash.get("access_token");
  const refreshToken = hash.get("refresh_token");
  if (hash.get("type") !== "recovery" || !accessToken || !refreshToken) {
    return { error: MISSING_LINK_MESSAGE };
  }
  return { tokens: { accessToken, refreshToken } };
}

export default function ResetPasswordPage() {
  const navigate = useViewTransitionNavigate();
  const [recovery] = useState(readRecoveryLink);
  const [state, setState] = useState<ResetStatus>(() =>
    "error" in recovery
      ? { status: "invalid", message: recovery.error }
      : { status: "checking" }
  );
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmationError, setConfirmationError] = useState<string | null>(
    null
  );
  const [formError, setFormError] = useState<string | null>(null);

  const validateReset = trpc.auth.validatePasswordReset.useMutation({
    onSuccess: () => setState({ status: "ready" }),
    onError: error => {
      // Só o link inválido/expirado é definitivo; falhas de rede ou do
      // provedor podem ser repetidas com os tokens ainda em memória.
      const linkRejected = error.data?.code === "BAD_REQUEST";
      setState({
        status: "invalid",
        message: error.data ? error.message : CONNECTION_MESSAGE,
        retryable: !linkRejected,
      });
    },
  });
  const resetPassword = trpc.auth.resetPassword.useMutation({
    onSuccess: () => {
      setPassword("");
      setConfirmation("");
      setState({ status: "done" });
      toast.success("Senha redefinida com sucesso.");
    },
    onError: error =>
      setFormError(error.data ? error.message : CONNECTION_MESSAGE),
  });

  const validateLink = () => {
    if (!("tokens" in recovery)) return;
    setState({ status: "checking" });
    validateReset.mutate({ accessToken: recovery.tokens.accessToken });
  };

  useEffect(() => {
    // Tira os tokens da barra de endereço e do histórico do navegador.
    if (window.location.hash || window.location.search) {
      window.history.replaceState(null, "", window.location.pathname);
    }
    validateLink();
  }, []);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!("tokens" in recovery)) return;
    const nextPasswordError = getNewPasswordError(password);
    const nextConfirmationError = getPasswordConfirmationError(
      password,
      confirmation
    );
    setPasswordError(nextPasswordError);
    setConfirmationError(nextConfirmationError);
    setFormError(null);
    if (nextPasswordError || nextConfirmationError) return;
    resetPassword.mutate({ ...recovery.tokens, password });
  };

  return (
    <main className="login-page login-page-enter min-h-svh w-full overflow-x-hidden bg-sand text-graphite md:h-svh md:overflow-hidden">
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
            href="/login"
            onClick={event => {
              event.preventDefault();
              navigate("/login");
            }}
            className="absolute left-6 top-6 z-20 inline-flex items-center gap-2 text-xs font-semibold text-paper transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-paper sm:left-10 sm:top-8 lg:left-12"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Voltar ao login
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

        <section className="login-panel login-panel-enter flex min-h-[65svh] flex-col overflow-y-auto bg-sand px-6 py-8 [view-transition-name:login-panel] sm:px-10 sm:py-10 md:h-svh md:min-h-0 lg:px-12">
          <div className="flex items-center justify-between gap-5">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-olive">
              Recuperação de acesso
            </p>
            <p className="inline-flex items-center gap-2 whitespace-nowrap font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-field">
              <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5" />
              Autenticação segura
            </p>
          </div>

          <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-12 sm:py-14 md:py-10">
            {state.status === "checking" ? (
              <div
                role="status"
                className="flex items-center gap-3 text-sm text-graphite/70"
              >
                <LoaderCircle
                  aria-hidden="true"
                  className="h-5 w-5 animate-spin text-field"
                />
                Validando o link de redefinição...
              </div>
            ) : null}

            {state.status === "invalid" ? (
              <>
                <ResetHeader
                  title="Link indisponível."
                  description="Não foi possível usar este link para redefinir a senha."
                />
                <p
                  role="alert"
                  className="mt-8 border-l-2 border-destructive bg-paper/60 px-5 py-4 text-sm leading-relaxed text-graphite/80"
                >
                  {state.message}
                </p>
                {state.retryable ? (
                  <>
                    <PrimaryButton
                      type="button"
                      onClick={validateLink}
                      className="mt-8"
                    >
                      Tentar novamente
                    </PrimaryButton>
                    <RequestNewLink
                      onClick={() => navigate("/login?modo=recuperar")}
                    />
                  </>
                ) : (
                  <PrimaryButton
                    type="button"
                    onClick={() => navigate("/login?modo=recuperar")}
                    className="mt-8"
                  >
                    Solicitar novo link
                  </PrimaryButton>
                )}
              </>
            ) : null}

            {state.status === "ready" ? (
              <>
                <ResetHeader
                  title="Crie uma nova senha."
                  description={`Use pelo menos ${PASSWORD_MIN_LENGTH} caracteres. Depois de salvar, entre novamente com a nova senha.`}
                />
                <form
                  className="mt-10 space-y-7"
                  onSubmit={handleSubmit}
                  noValidate
                >
                  <AuthField
                    id="reset-password"
                    label="Nova senha"
                    type="password"
                    autoComplete="new-password"
                    revealable
                    required
                    value={password}
                    onChange={event => setPassword(event.target.value)}
                    error={passwordError}
                  />
                  <AuthField
                    id="reset-password-confirmation"
                    label="Confirmar nova senha"
                    type="password"
                    autoComplete="new-password"
                    revealable
                    required
                    value={confirmation}
                    onChange={event => setConfirmation(event.target.value)}
                    error={confirmationError}
                  />
                  {formError ? (
                    <p
                      role="alert"
                      className="border-l-2 border-destructive bg-paper/60 px-5 py-4 text-sm leading-relaxed text-graphite/80"
                    >
                      {formError}
                    </p>
                  ) : null}
                  <PrimaryButton
                    type="submit"
                    disabled={resetPassword.isPending}
                  >
                    {resetPassword.isPending
                      ? "Salvando..."
                      : "Salvar nova senha"}
                  </PrimaryButton>
                </form>
                <RequestNewLink
                  onClick={() => navigate("/login?modo=recuperar")}
                />
              </>
            ) : null}

            {state.status === "done" ? (
              <>
                <ResetHeader
                  title="Senha redefinida."
                  description="Sua senha foi atualizada com segurança. Entre com a nova senha para continuar."
                />
                <PrimaryButton
                  type="button"
                  onClick={() => navigate("/login")}
                  className="mt-10"
                >
                  Ir para o login
                </PrimaryButton>
              </>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}

function RequestNewLink({ onClick }: { onClick: () => void }) {
  return (
    <p className="mt-7 text-sm text-graphite/60">
      O link não funciona mais?{" "}
      <button
        type="button"
        onClick={onClick}
        className="font-semibold text-field underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-field"
      >
        Solicitar novo link
      </button>
    </p>
  );
}

function ResetHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <header>
      <h2 className="font-display text-5xl font-bold leading-none text-graphite sm:text-6xl">
        {title}
      </h2>
      <p className="mt-4 max-w-sm text-sm leading-relaxed text-graphite/65 sm:text-base">
        {description}
      </p>
    </header>
  );
}

function PrimaryButton({
  children,
  className = "",
  ...buttonProps
}: {
  children: ReactNode;
  className?: string;
  type: "button" | "submit";
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      {...buttonProps}
      className={`group relative flex h-13 w-full items-center justify-between overflow-hidden border border-field bg-field px-5 text-left font-semibold text-sand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-field focus-visible:ring-offset-2 focus-visible:ring-offset-sand disabled:cursor-wait disabled:opacity-60 ${className}`}
    >
      <span className="absolute inset-0 origin-left scale-x-0 bg-paper transition-transform duration-300 ease-out group-hover:scale-x-100 group-focus-visible:scale-x-100" />
      <span className="relative z-10 transition-colors duration-300 group-hover:text-field group-focus-visible:text-field">
        {children}
      </span>
      <ArrowRight
        aria-hidden="true"
        className="relative z-10 h-4 w-4 transition-colors duration-300 group-hover:text-field group-focus-visible:text-field"
      />
    </button>
  );
}
