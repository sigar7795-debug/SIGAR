import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";
import type { TrpcContext } from "./_core/context";
import { getSessionCookieOptions } from "./_core/cookies";
import { sdk } from "./_core/sdk";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { financeRouter } from "./routers/finance";
import {
  getSupabaseUserName,
  signInWithSupabase,
  signUpWithSupabase,
} from "./supabaseAuth";

const authInput = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
  remember: z.boolean().default(true),
});

async function persistAuthenticatedUser(
  supabaseUser: Awaited<ReturnType<typeof signInWithSupabase>>
) {
  const name = getSupabaseUserName(supabaseUser);
  await db.upsertUser({
    openId: supabaseUser.id,
    name,
    email: supabaseUser.email ?? null,
    loginMethod: "supabase-email",
    lastSignedIn: new Date(),
  });
  const user = await db.getUserByOpenId(supabaseUser.id);
  if (!user) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Não foi possível preparar a conta no SIGAR.",
    });
  }
  return user;
}

async function setSessionCookie(
  ctx: Pick<TrpcContext, "req" | "res">,
  user: Awaited<ReturnType<typeof persistAuthenticatedUser>>,
  remember: boolean
) {
  const expiresInMs = remember ? ONE_YEAR_MS : 1000 * 60 * 60 * 8;
  const sessionToken = await sdk.signSession(
    { openId: user.openId, appId: "sigar", name: user.name || "Usuário SIGAR" },
    { expiresInMs }
  );
  const cookieOptions = getSessionCookieOptions(ctx.req);
  ctx.res.cookie(COOKIE_NAME, sessionToken, {
    ...cookieOptions,
    ...(remember ? { maxAge: expiresInMs } : {}),
  });
}

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    login: publicProcedure.input(authInput).mutation(async ({ ctx, input }) => {
      const supabaseUser = await signInWithSupabase(
        input.email,
        input.password
      );
      const user = await persistAuthenticatedUser(supabaseUser);
      await setSessionCookie(ctx, user, input.remember);
      return user;
    }),
    signUp: publicProcedure
      .input(
        authInput.extend({
          name: z.string().trim().min(3).max(160),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const result = await signUpWithSupabase(
          input.email,
          input.password,
          input.name
        );
        if (result.requiresEmailConfirmation) {
          return {
            authenticated: false as const,
            requiresEmailConfirmation: true as const,
          };
        }
        const user = await persistAuthenticatedUser(result.user);
        await setSessionCookie(ctx, user, input.remember);
        return {
          authenticated: true as const,
          requiresEmailConfirmation: false as const,
          user,
        };
      }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  finance: financeRouter,
});

export type AppRouter = typeof appRouter;
