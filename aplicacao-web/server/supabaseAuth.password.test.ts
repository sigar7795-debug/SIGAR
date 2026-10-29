import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const supabaseAuthApi = vi.hoisted(() => ({
  resetPasswordForEmail: vi.fn(),
  getUser: vi.fn(),
  setSession: vi.fn(),
  updateUser: vi.fn(),
  signOut: vi.fn(),
  signInWithPassword: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({ auth: supabaseAuthApi })),
}));
vi.mock("./_core/env", () => ({
  ENV: {
    supabaseUrl: "https://projeto.supabase.co",
    supabaseAnonKey: "anon-key",
    cookieSecret: "segredo-de-teste",
    appUrl: "",
  },
}));

import {
  changePasswordWithSupabase,
  PasswordFlowError,
  resetPasswordWithRecoveryToken,
  sendPasswordResetEmail,
  verifyPasswordResetToken,
} from "./supabaseAuth";

const supabaseUser = { id: "supabase-user-id", email: "ana@example.com" };

function jwt(claims: Record<string, unknown>) {
  const encode = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  return [
    encode({ alg: "HS256", typ: "JWT" }),
    encode(claims),
    "assinatura",
  ].join(".");
}

function recoveryToken(overrides: Record<string, unknown> = {}) {
  return jwt({
    sub: supabaseUser.id,
    exp: Math.floor(Date.now() / 1000) + 600,
    amr: [{ method: "recovery", timestamp: 1 }],
    ...overrides,
  });
}

function authError(status: number, code: string) {
  return { name: "AuthApiError", status, code, message: `erro ${code}` };
}

async function rejectionOf(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    return error as PasswordFlowError;
  }
  throw new Error("A operação deveria ter falhado.");
}

beforeEach(() => {
  vi.clearAllMocks();
  supabaseAuthApi.signOut.mockResolvedValue({ error: null });
});

describe("sendPasswordResetEmail", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("asks Supabase for the recovery e-mail with the reset page as redirect", async () => {
    supabaseAuthApi.resetPasswordForEmail.mockResolvedValue({
      data: {},
      error: null,
    });

    const result = await sendPasswordResetEmail(
      "ana@example.com",
      "https://sigar.example/redefinir-senha",
      0
    );

    expect(result).toEqual({ reason: null });
    expect(supabaseAuthApi.resetPasswordForEmail).toHaveBeenCalledWith(
      "ana@example.com",
      { redirectTo: "https://sigar.example/redefinir-senha" }
    );
  });

  it("never throws on provider errors, so the caller cannot reveal the account state", async () => {
    supabaseAuthApi.resetPasswordForEmail.mockResolvedValueOnce({
      data: null,
      error: authError(429, "over_email_send_rate_limit"),
    });
    supabaseAuthApi.resetPasswordForEmail.mockRejectedValueOnce(
      new Error("network down")
    );

    await expect(
      sendPasswordResetEmail("ana@example.com", undefined, 0)
    ).resolves.toEqual({ reason: "rate_limited" });
    await expect(
      sendPasswordResetEmail("ninguem@example.com", undefined, 0)
    ).resolves.toEqual({ reason: "provider_error" });
  });

  it("waits a minimum time so fast and slow provider answers look the same", async () => {
    vi.useFakeTimers();
    supabaseAuthApi.resetPasswordForEmail.mockResolvedValue({
      data: {},
      error: null,
    });
    let settled = false;
    const pending = sendPasswordResetEmail("ana@example.com", undefined).then(
      result => {
        settled = true;
        return result;
      }
    );

    await vi.advanceTimersByTimeAsync(1400);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(100);
    expect(settled).toBe(true);
    await expect(pending).resolves.toEqual({ reason: null });
  });
});

describe("verifyPasswordResetToken", () => {
  it("accepts a live recovery token confirmed by Supabase", async () => {
    supabaseAuthApi.getUser.mockResolvedValue({
      data: { user: supabaseUser },
      error: null,
    });
    const token = recoveryToken();

    await expect(verifyPasswordResetToken(token)).resolves.toEqual(
      supabaseUser
    );
    expect(supabaseAuthApi.getUser).toHaveBeenCalledWith(token);
  });

  it("rejects an expired token before calling Supabase", async () => {
    const error = await rejectionOf(
      verifyPasswordResetToken(
        recoveryToken({ exp: Math.floor(Date.now() / 1000) - 1 })
      )
    );

    expect(error).toBeInstanceOf(PasswordFlowError);
    expect(error.reason).toBe("expired_token");
    expect(error.message).toBe(
      "O link de redefinição expirou. Solicite um novo link."
    );
    expect(supabaseAuthApi.getUser).not.toHaveBeenCalled();
  });

  it("rejects a regular login token and malformed values", async () => {
    const loginToken = recoveryToken({
      amr: [{ method: "password", timestamp: 1 }],
    });

    expect(
      (await rejectionOf(verifyPasswordResetToken(loginToken))).reason
    ).toBe("invalid_token");
    expect(
      (await rejectionOf(verifyPasswordResetToken("nao-e-jwt"))).reason
    ).toBe("invalid_token");
    expect(supabaseAuthApi.getUser).not.toHaveBeenCalled();
  });

  it("rejects a recovery session that Supabase no longer recognises", async () => {
    supabaseAuthApi.getUser.mockResolvedValue({
      data: { user: null },
      error: authError(403, "session_not_found"),
    });

    const error = await rejectionOf(verifyPasswordResetToken(recoveryToken()));

    expect(error.reason).toBe("invalid_token");
    expect(error.code).toBe("BAD_REQUEST");
  });
});

describe("resetPasswordWithRecoveryToken", () => {
  it("updates the password and revokes the recovery session", async () => {
    supabaseAuthApi.setSession.mockResolvedValue({
      data: { user: supabaseUser, session: {} },
      error: null,
    });
    supabaseAuthApi.updateUser.mockResolvedValue({
      data: { user: supabaseUser },
      error: null,
    });
    const token = recoveryToken();

    const user = await resetPasswordWithRecoveryToken(
      token,
      "refresh-token",
      "nova-senha-123"
    );

    expect(user).toEqual(supabaseUser);
    expect(supabaseAuthApi.setSession).toHaveBeenCalledWith({
      access_token: token,
      refresh_token: "refresh-token",
    });
    expect(supabaseAuthApi.updateUser).toHaveBeenCalledWith({
      password: "nova-senha-123",
    });
    expect(supabaseAuthApi.signOut).toHaveBeenCalledWith({ scope: "global" });
  });

  it("translates Supabase password errors into clear messages", async () => {
    supabaseAuthApi.setSession.mockResolvedValue({
      data: { user: supabaseUser, session: {} },
      error: null,
    });
    supabaseAuthApi.updateUser.mockResolvedValueOnce({
      data: { user: null },
      error: authError(422, "same_password"),
    });
    supabaseAuthApi.updateUser.mockResolvedValueOnce({
      data: { user: null },
      error: authError(422, "weak_password"),
    });

    const samePassword = await rejectionOf(
      resetPasswordWithRecoveryToken(recoveryToken(), "refresh", "senha-antiga")
    );
    const weakPassword = await rejectionOf(
      resetPasswordWithRecoveryToken(recoveryToken(), "refresh", "12345678")
    );

    expect(samePassword.message).toBe(
      "A nova senha deve ser diferente da senha atual."
    );
    expect(weakPassword.reason).toBe("weak_password");
    expect(supabaseAuthApi.signOut).not.toHaveBeenCalled();
  });
});

describe("changePasswordWithSupabase", () => {
  it("confirms the current password before updating it", async () => {
    supabaseAuthApi.signInWithPassword.mockResolvedValue({
      data: { user: supabaseUser, session: { access_token: "a" } },
      error: null,
    });
    supabaseAuthApi.updateUser.mockResolvedValue({
      data: { user: supabaseUser },
      error: null,
    });

    await changePasswordWithSupabase(
      "ana@example.com",
      "senha-atual",
      "senha-nova-123"
    );

    expect(supabaseAuthApi.signInWithPassword).toHaveBeenCalledWith({
      email: "ana@example.com",
      password: "senha-atual",
    });
    expect(supabaseAuthApi.updateUser).toHaveBeenCalledWith({
      password: "senha-nova-123",
    });
    expect(supabaseAuthApi.signOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it("refuses to update when the current password is wrong", async () => {
    supabaseAuthApi.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: authError(400, "invalid_credentials"),
    });

    const error = await rejectionOf(
      changePasswordWithSupabase("ana@example.com", "errada", "senha-nova-123")
    );

    expect(error.reason).toBe("wrong_current_password");
    expect(error.message).toBe("A senha atual está incorreta.");
    expect(supabaseAuthApi.updateUser).not.toHaveBeenCalled();
  });
});
