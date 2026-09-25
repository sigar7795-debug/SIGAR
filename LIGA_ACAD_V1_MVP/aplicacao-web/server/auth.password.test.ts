import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const provider = vi.hoisted(() => ({
  sendPasswordResetEmail: vi.fn(),
  verifyPasswordResetToken: vi.fn(),
  resetPasswordWithRecoveryToken: vi.fn(),
  changePasswordWithSupabase: vi.fn(),
}));

const database = vi.hoisted(() => ({
  insertSecurityEvent: vi.fn(),
  getUserByOpenId: vi.fn(),
}));

vi.mock("./supabaseAuth", async importOriginal => ({
  ...(await importOriginal<typeof import("./supabaseAuth")>()),
  ...provider,
}));
vi.mock("./db", () => database);

import { createDemoOpenId } from "./demo";
import { appRouter } from "./routers";
import { PasswordFlowError } from "./supabaseAuth";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

const ACCESS_TOKEN = "eyJhbGciOiJIUzI1NiJ9.recovery-access-token.assinatura";
const REFRESH_TOKEN = "recovery-refresh-token";
const NEW_PASSWORD = "Nova-Senha-Forte-2026";
const CURRENT_PASSWORD = "Senha-Atual-2025";

const accountUser: AuthenticatedUser = {
  id: 7,
  openId: "supabase-user-id",
  email: "ana@example.com",
  name: "Ana Souza",
  loginMethod: "supabase-email",
  role: "user",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

function createCaller(user: AuthenticatedUser | null = null) {
  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      ip: "203.0.113.7",
      headers: { host: "sigar.example" },
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
  return appRouter.createCaller(ctx);
}

function recordedEvents() {
  return database.insertSecurityEvent.mock.calls.map(([event]) => event);
}

/** Nenhum evento gravado pode conter senha, token ou e-mail em claro. */
function expectNoSecretsRecorded(...secrets: string[]) {
  const stored = JSON.stringify(recordedEvents());
  for (const secret of secrets) expect(stored).not.toContain(secret);
}

async function rejectionOf(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    return error as TRPCError;
  }
  throw new Error("A operação deveria ter falhado.");
}

beforeEach(() => {
  vi.clearAllMocks();
  database.insertSecurityEvent.mockResolvedValue(undefined);
  database.getUserByOpenId.mockResolvedValue(accountUser);
});

describe("auth.requestPasswordReset", () => {
  it("answers the same way whether or not the account exists", async () => {
    provider.sendPasswordResetEmail.mockResolvedValueOnce({ reason: null });
    provider.sendPasswordResetEmail.mockResolvedValueOnce({
      reason: "rate_limited",
    });
    const caller = createCaller();

    const known = await caller.auth.requestPasswordReset({
      email: "ana@example.com",
    });
    const unknown = await caller.auth.requestPasswordReset({
      email: "ninguem@example.com",
    });

    expect(known).toEqual({ success: true });
    expect(unknown).toEqual(known);
  });

  it("sends the link to the reset page of the current host", async () => {
    provider.sendPasswordResetEmail.mockResolvedValue({ reason: null });

    await createCaller().auth.requestPasswordReset({
      email: " ana@example.com ",
    });

    expect(provider.sendPasswordResetEmail).toHaveBeenCalledWith(
      "ana@example.com",
      "https://sigar.example/redefinir-senha"
    );
  });

  it("records the request with a hashed e-mail only", async () => {
    provider.sendPasswordResetEmail.mockResolvedValue({
      reason: "rate_limited",
    });

    await createCaller().auth.requestPasswordReset({
      email: "Ana@Example.com",
    });

    expect(recordedEvents()).toEqual([
      {
        eventType: "password_reset_requested",
        userId: null,
        emailHash: expect.stringMatching(/^[0-9a-f]{64}$/),
        reason: "rate_limited",
        ipAddress: "203.0.113.7",
      },
    ]);
    expectNoSecretsRecorded("ana@example.com", "Ana@Example.com");
  });

  it("still answers when the audit trail cannot be written", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    provider.sendPasswordResetEmail.mockResolvedValue({ reason: null });
    database.insertSecurityEvent.mockRejectedValue(new Error("db offline"));

    await expect(
      createCaller().auth.requestPasswordReset({ email: "ana@example.com" })
    ).resolves.toEqual({ success: true });
    expect(JSON.stringify(warn.mock.calls)).not.toContain("ana@example.com");
    warn.mockRestore();
  });
});

describe("auth.validatePasswordReset", () => {
  it("confirms a valid recovery link", async () => {
    provider.verifyPasswordResetToken.mockResolvedValue({
      id: "supabase-user-id",
    });

    await expect(
      createCaller().auth.validatePasswordReset({ accessToken: ACCESS_TOKEN })
    ).resolves.toEqual({ valid: true });
    expect(provider.verifyPasswordResetToken).toHaveBeenCalledWith(
      ACCESS_TOKEN
    );
  });

  it("reports an expired link clearly and records the failure", async () => {
    provider.verifyPasswordResetToken.mockRejectedValue(
      new PasswordFlowError("expired_token")
    );

    const error = await rejectionOf(
      createCaller().auth.validatePasswordReset({ accessToken: ACCESS_TOKEN })
    );

    expect(error.code).toBe("BAD_REQUEST");
    expect(error.message).toBe(
      "O link de redefinição expirou. Solicite um novo link."
    );
    expect(recordedEvents()).toEqual([
      expect.objectContaining({
        eventType: "password_reset_failed",
        reason: "expired_token",
      }),
    ]);
    expectNoSecretsRecorded(ACCESS_TOKEN);
  });
});

describe("auth.resetPassword", () => {
  it("sets the new password and records the completion", async () => {
    provider.resetPasswordWithRecoveryToken.mockResolvedValue({
      id: "supabase-user-id",
      email: "ana@example.com",
    });

    const result = await createCaller().auth.resetPassword({
      accessToken: ACCESS_TOKEN,
      refreshToken: REFRESH_TOKEN,
      password: NEW_PASSWORD,
    });

    expect(result).toEqual({ success: true });
    expect(provider.resetPasswordWithRecoveryToken).toHaveBeenCalledWith(
      ACCESS_TOKEN,
      REFRESH_TOKEN,
      NEW_PASSWORD
    );
    expect(database.getUserByOpenId).toHaveBeenCalledWith("supabase-user-id");
    expect(recordedEvents()).toEqual([
      expect.objectContaining({
        eventType: "password_reset_completed",
        userId: accountUser.id,
        emailHash: expect.stringMatching(/^[0-9a-f]{64}$/),
      }),
    ]);
    expectNoSecretsRecorded(
      ACCESS_TOKEN,
      REFRESH_TOKEN,
      NEW_PASSWORD,
      "ana@example.com"
    );
  });

  it("rejects a password outside the policy without touching Supabase", async () => {
    const error = await rejectionOf(
      createCaller().auth.resetPassword({
        accessToken: ACCESS_TOKEN,
        refreshToken: REFRESH_TOKEN,
        password: "curta",
      })
    );

    expect(error.code).toBe("BAD_REQUEST");
    expect(error.message).toBe(
      "A nova senha deve ter pelo menos 8 caracteres."
    );
    expect(provider.resetPasswordWithRecoveryToken).not.toHaveBeenCalled();
  });

  it("records a failed reset with its reason but without secrets", async () => {
    provider.resetPasswordWithRecoveryToken.mockRejectedValue(
      new PasswordFlowError("invalid_token")
    );

    const error = await rejectionOf(
      createCaller().auth.resetPassword({
        accessToken: ACCESS_TOKEN,
        refreshToken: REFRESH_TOKEN,
        password: NEW_PASSWORD,
      })
    );

    expect(error.message).toBe(
      "O link de redefinição é inválido ou já foi utilizado. Solicite um novo link."
    );
    expect(recordedEvents()).toEqual([
      expect.objectContaining({
        eventType: "password_reset_failed",
        reason: "invalid_token",
      }),
    ]);
    expectNoSecretsRecorded(ACCESS_TOKEN, REFRESH_TOKEN, NEW_PASSWORD);
  });
});

describe("auth.changePassword", () => {
  it("requires an authenticated session", async () => {
    const error = await rejectionOf(
      createCaller().auth.changePassword({
        currentPassword: CURRENT_PASSWORD,
        newPassword: NEW_PASSWORD,
      })
    );

    expect(error.code).toBe("UNAUTHORIZED");
    expect(provider.changePasswordWithSupabase).not.toHaveBeenCalled();
  });

  it("changes the password of the signed-in account", async () => {
    provider.changePasswordWithSupabase.mockResolvedValue(undefined);

    const result = await createCaller(accountUser).auth.changePassword({
      currentPassword: CURRENT_PASSWORD,
      newPassword: NEW_PASSWORD,
    });

    expect(result).toEqual({ success: true });
    expect(provider.changePasswordWithSupabase).toHaveBeenCalledWith(
      "ana@example.com",
      CURRENT_PASSWORD,
      NEW_PASSWORD
    );
    expect(recordedEvents()).toEqual([
      expect.objectContaining({
        eventType: "password_change_completed",
        userId: accountUser.id,
      }),
    ]);
    expectNoSecretsRecorded(CURRENT_PASSWORD, NEW_PASSWORD);
  });

  it("explains a wrong current password and records the attempt", async () => {
    provider.changePasswordWithSupabase.mockRejectedValue(
      new PasswordFlowError("wrong_current_password")
    );

    const error = await rejectionOf(
      createCaller(accountUser).auth.changePassword({
        currentPassword: "Senha-Errada-1",
        newPassword: NEW_PASSWORD,
      })
    );

    expect(error.code).toBe("BAD_REQUEST");
    expect(error.message).toBe("A senha atual está incorreta.");
    expect(recordedEvents()).toEqual([
      expect.objectContaining({
        eventType: "password_change_failed",
        userId: accountUser.id,
        reason: "wrong_current_password",
      }),
    ]);
    expectNoSecretsRecorded("Senha-Errada-1", NEW_PASSWORD);
  });

  it("rejects reusing the current password", async () => {
    const error = await rejectionOf(
      createCaller(accountUser).auth.changePassword({
        currentPassword: CURRENT_PASSWORD,
        newPassword: CURRENT_PASSWORD,
      })
    );

    expect(error.message).toBe(
      "A nova senha deve ser diferente da senha atual."
    );
    expect(provider.changePasswordWithSupabase).not.toHaveBeenCalled();
  });

  it("does not offer password changes to the demo account", async () => {
    const demoUser: AuthenticatedUser = {
      ...accountUser,
      id: -1,
      openId: createDemoOpenId("demonstracao@sigar.local"),
      loginMethod: "demonstracao",
    };

    const error = await rejectionOf(
      createCaller(demoUser).auth.changePassword({
        currentPassword: CURRENT_PASSWORD,
        newPassword: NEW_PASSWORD,
      })
    );

    expect(error.code).toBe("FORBIDDEN");
    expect(provider.changePasswordWithSupabase).not.toHaveBeenCalled();
  });
});
