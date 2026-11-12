import { describe, expect, it, vi } from "vitest";
import { COOKIE_NAME, ONE_YEAR_MS } from "../shared/const";
import type { TrpcContext } from "./_core/context";

const authProvider = vi.hoisted(() => ({
  getSupabaseUserName: vi.fn(() => "Teste Sigar"),
  signInWithSupabase: vi.fn(async () => ({
    id: "supabase-user-id",
    email: "teste.sigar@example.com",
    user_metadata: { full_name: "Teste Sigar" },
  })),
  signUpWithSupabase: vi.fn(),
}));

const database = vi.hoisted(() => ({
  upsertUser: vi.fn(),
  getUserByOpenId: vi.fn(async () => ({
    id: 7,
    openId: "supabase-user-id",
    email: "teste.sigar@example.com",
    name: "Teste Sigar",
    loginMethod: "supabase-email",
    role: "user" as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  })),
}));

vi.mock("./supabaseAuth", () => authProvider);
vi.mock("./db", () => database);

import { appRouter } from "./routers";

type CookieCall = {
  name: string;
  options: Record<string, unknown>;
};

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): {
  ctx: TrpcContext;
  clearedCookies: CookieCall[];
} {
  const clearedCookies: CookieCall[] = [];

  const user: AuthenticatedUser = {
    id: 1,
    openId: "sample-user",
    email: "sample@example.com",
    name: "Sample User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };

  return { ctx, clearedCookies };
}

describe("auth.logout", () => {
  it("clears the session cookie and reports success", async () => {
    const { ctx, clearedCookies } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.logout();

    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0]?.name).toBe(COOKIE_NAME);
    expect(clearedCookies[0]?.options).toMatchObject({
      maxAge: -1,
      secure: true,
      sameSite: "none",
      httpOnly: true,
      path: "/",
    });
  });
});

describe("auth.login", () => {
  it("creates a Supabase-backed session with a browser-compatible cookie", async () => {
    const cookies: Array<{
      name: string;
      value: string;
      options: Record<string, unknown>;
    }> = [];
    const ctx: TrpcContext = {
      user: null,
      req: {
        protocol: "http",
        headers: {},
      } as TrpcContext["req"],
      res: {
        cookie: (
          name: string,
          value: string,
          options: Record<string, unknown>
        ) => {
          cookies.push({ name, value, options });
        },
      } as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);

    const user = await caller.auth.login({
      email: "teste.sigar@example.com",
      password: "senha-segura",
      remember: true,
    });

    expect(user).toMatchObject({
      email: "teste.sigar@example.com",
      name: "Teste Sigar",
      loginMethod: "supabase-email",
      role: "user",
    });
    expect(authProvider.signInWithSupabase).toHaveBeenCalledWith(
      "teste.sigar@example.com",
      "senha-segura"
    );
    expect(cookies).toHaveLength(1);
    expect(cookies[0]?.name).toBe(COOKIE_NAME);
    expect(cookies[0]?.value).toEqual(expect.any(String));
    expect(cookies[0]?.options).toMatchObject({
      maxAge: ONE_YEAR_MS,
      secure: false,
      sameSite: "lax",
      httpOnly: true,
      path: "/",
    });
  });
});
