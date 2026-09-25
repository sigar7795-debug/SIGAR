import {
  createClient,
  type AuthError,
  type User as SupabaseUser,
} from "@supabase/supabase-js";
import { TRPCError } from "@trpc/server";
import { decodeJwt } from "jose";
import { SAME_PASSWORD_ERROR } from "../shared/passwordPolicy.js";
import { ENV } from "./_core/env.js";

function createAuthClient() {
  if (!ENV.supabaseUrl || !ENV.supabaseAnonKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "A autenticação do SIGAR ainda não foi configurada.",
    });
  }

  return createClient(ENV.supabaseUrl, ENV.supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

function authError(message: string, fallback: string) {
  const invalidCredentials = message.toLowerCase().includes("invalid login");
  return new TRPCError({
    code: invalidCredentials ? "UNAUTHORIZED" : "BAD_REQUEST",
    message: invalidCredentials ? "E-mail ou senha inválidos." : fallback,
  });
}

export async function signInWithSupabase(email: string, password: string) {
  const client = createAuthClient();
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    throw authError(error?.message ?? "", "Não foi possível entrar no SIGAR.");
  }

  return data.user;
}

export async function signUpWithSupabase(
  email: string,
  password: string,
  name: string
) {
  const client = createAuthClient();
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: { data: { name, full_name: name } },
  });

  if (error || !data.user) {
    throw authError(error?.message ?? "", "Não foi possível criar a conta.");
  }

  return {
    user: data.user,
    requiresEmailConfirmation: !data.session,
  };
}

export type PasswordFailureReason =
  | "invalid_token"
  | "expired_token"
  | "wrong_current_password"
  | "same_password"
  | "weak_password"
  | "rate_limited"
  | "provider_error";

const passwordFailureMessages: Record<PasswordFailureReason, string> = {
  invalid_token:
    "O link de redefinição é inválido ou já foi utilizado. Solicite um novo link.",
  expired_token: "O link de redefinição expirou. Solicite um novo link.",
  wrong_current_password: "A senha atual está incorreta.",
  same_password: SAME_PASSWORD_ERROR,
  weak_password:
    "A nova senha não atende aos requisitos de segurança. Escolha uma senha mais forte.",
  rate_limited:
    "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.",
  provider_error:
    "Não foi possível atualizar a senha agora. Tente novamente em instantes.",
};

/** Erro de senha com um motivo fixo, seguro para auditoria e para o cliente. */
export class PasswordFlowError extends TRPCError {
  readonly reason: PasswordFailureReason;

  constructor(reason: PasswordFailureReason) {
    super({
      code:
        reason === "rate_limited"
          ? "TOO_MANY_REQUESTS"
          : reason === "provider_error"
            ? "INTERNAL_SERVER_ERROR"
            : "BAD_REQUEST",
      message: passwordFailureMessages[reason],
    });
    this.reason = reason;
  }
}

const authErrorReasons: Partial<Record<string, PasswordFailureReason>> = {
  invalid_credentials: "wrong_current_password",
  same_password: "same_password",
  weak_password: "weak_password",
  bad_jwt: "invalid_token",
  session_not_found: "invalid_token",
  refresh_token_not_found: "invalid_token",
};

function passwordReasonFromAuthError(
  error: AuthError | null,
  fallback: PasswordFailureReason
): PasswordFailureReason {
  if (error?.status === 429) return "rate_limited";
  return (error?.code && authErrorReasons[error.code]) || fallback;
}

// Resposta com duração mínima para o tempo não indicar se a conta existe.
const PASSWORD_RESET_MIN_RESPONSE_MS = 1500;

/**
 * Pede ao Supabase o e-mail de redefinição. Nunca propaga o resultado ao
 * cliente: o motivo devolvido serve apenas para auditoria.
 */
export async function sendPasswordResetEmail(
  email: string,
  redirectTo: string | undefined,
  minDurationMs = PASSWORD_RESET_MIN_RESPONSE_MS
): Promise<{ reason: PasswordFailureReason | null }> {
  const client = createAuthClient();
  const minimumDuration = new Promise(resolve =>
    setTimeout(resolve, minDurationMs)
  );
  let reason: PasswordFailureReason | null = null;
  try {
    const { error } = await client.auth.resetPasswordForEmail(
      email,
      redirectTo ? { redirectTo } : {}
    );
    if (error) reason = passwordReasonFromAuthError(error, "provider_error");
  } catch {
    reason = "provider_error";
  }
  await minimumDuration;
  return { reason };
}

/**
 * Checagem local do token do link: precisa ser uma sessão de recuperação
 * ainda válida. A assinatura é confirmada pelo Supabase logo a seguir.
 */
function assertRecoveryToken(accessToken: string) {
  let claims: ReturnType<typeof decodeJwt>;
  try {
    claims = decodeJwt(accessToken);
  } catch {
    throw new PasswordFlowError("invalid_token");
  }

  const isRecovery =
    Array.isArray(claims.amr) &&
    claims.amr.some(
      entry =>
        typeof entry === "object" &&
        entry !== null &&
        (entry as { method?: unknown }).method === "recovery"
    );
  if (!isRecovery) throw new PasswordFlowError("invalid_token");
  if (typeof claims.exp !== "number" || claims.exp * 1000 <= Date.now()) {
    throw new PasswordFlowError("expired_token");
  }
}

export async function verifyPasswordResetToken(accessToken: string) {
  assertRecoveryToken(accessToken);
  const client = createAuthClient();
  const { data, error } = await client.auth.getUser(accessToken);
  if (error || !data.user) {
    throw new PasswordFlowError(
      passwordReasonFromAuthError(error, "invalid_token")
    );
  }
  return data.user;
}

export async function resetPasswordWithRecoveryToken(
  accessToken: string,
  refreshToken: string,
  password: string
) {
  assertRecoveryToken(accessToken);
  const client = createAuthClient();
  const { data, error } = await client.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  if (error || !data.user) {
    throw new PasswordFlowError(
      passwordReasonFromAuthError(error, "invalid_token")
    );
  }

  const { error: updateError } = await client.auth.updateUser({ password });
  if (updateError) {
    throw new PasswordFlowError(
      passwordReasonFromAuthError(updateError, "provider_error")
    );
  }

  // Revoga a sessão de recuperação (e as demais) para o link não ser reutilizado.
  await client.auth.signOut({ scope: "global" }).catch(() => undefined);
  return data.user;
}

export async function changePasswordWithSupabase(
  email: string,
  currentPassword: string,
  newPassword: string
) {
  const client = createAuthClient();
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password: currentPassword,
  });
  if (error || !data.session) {
    throw new PasswordFlowError(
      passwordReasonFromAuthError(error, "provider_error")
    );
  }

  const { error: updateError } = await client.auth.updateUser({
    password: newPassword,
  });
  // Descarta a sessão temporária usada só para confirmar a senha atual.
  await client.auth.signOut({ scope: "local" }).catch(() => undefined);
  if (updateError) {
    throw new PasswordFlowError(
      passwordReasonFromAuthError(updateError, "provider_error")
    );
  }
}

export function getSupabaseUserName(user: SupabaseUser) {
  const metadataName =
    user.user_metadata?.full_name ?? user.user_metadata?.name;
  if (typeof metadataName === "string" && metadataName.trim()) {
    return metadataName.trim();
  }

  return user.email?.split("@")[0] || "Usuário SIGAR";
}
