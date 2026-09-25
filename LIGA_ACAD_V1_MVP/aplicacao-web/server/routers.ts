import { COOKIE_NAME, ONE_YEAR_MS } from "../shared/const.js";
import {
  getNewPasswordError,
  SAME_PASSWORD_ERROR,
} from "../shared/passwordPolicy.js";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db.js";
import type { TrpcContext } from "./_core/context.js";
import { getSessionCookieOptions } from "./_core/cookies.js";
import { ENV } from "./_core/env.js";
import { sdk } from "./_core/sdk.js";
import { systemRouter } from "./_core/systemRouter.js";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc.js";
import {
  buildDemoUser,
  createDemoOpenId,
  getDemoName,
  isDemoOpenId,
} from "./demo.js";
import { financeRouter } from "./routers/finance.js";
import { recordSecurityEvent } from "./securityEvents.js";
import {
  changePasswordWithSupabase,
  getSupabaseUserName,
  PasswordFlowError,
  resetPasswordWithRecoveryToken,
  sendPasswordResetEmail,
  signInWithSupabase,
  signUpWithSupabase,
  verifyPasswordResetToken,
} from "./supabaseAuth.js";

const authInput = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
  remember: z.boolean().default(true),
});

// Tokens do link de recuperação: só trafegam no corpo de mutations (POST),
// nunca na URL, para não aparecerem em logs de acesso.
const recoveryAccessToken = z.string().min(1).max(4096);
const recoveryRefreshToken = z.string().min(1).max(512);
const passwordInput = z.string().max(256);

function assertNewPassword(password: string) {
  const policyError = getNewPasswordError(password);
  if (policyError) {
    throw new TRPCError({ code: "BAD_REQUEST", message: policyError });
  }
}

function passwordFailureReason(error: unknown) {
  return error instanceof PasswordFlowError ? error.reason : "provider_error";
}

function getPasswordResetRedirectUrl(req: TrpcContext["req"]) {
  const baseUrl =
    ENV.appUrl ||
    (req.headers.host ? `${req.protocol}://${req.headers.host}` : "");
  // Sem URL, o Supabase usa o Site URL; a página inicial reencaminha o link.
  return baseUrl ? new URL("/redefinir-senha", baseUrl).toString() : undefined;
}

async function persistAuthenticatedUser(
  supabaseUser: Awaited<ReturnType<typeof signInWithSupabase>>
) {
  const name = getSupabaseUserName(supabaseUser);
  try {
    await db.upsertUser({
      openId: supabaseUser.id,
      name,
      email: supabaseUser.email ?? null,
      loginMethod: "supabase-email",
      lastSignedIn: new Date(),
    });
    const user = await db.getUserByOpenId(supabaseUser.id);
    if (user) return user;
  } catch {
    // The database layer records a sanitized diagnostic code.
  }

  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "Não foi possível preparar a conta no SIGAR.",
  });
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
    demoLogin: publicProcedure
      .input(z.object({ remember: z.boolean().default(true) }))
      .mutation(async ({ ctx, input }) => {
        const email = "demonstracao@sigar.local";
        const openId = createDemoOpenId(email);
        const name = getDemoName(email);
        const expiresInMs = input.remember
          ? ONE_YEAR_MS
          : 1000 * 60 * 60 * 8;
        const sessionToken = await sdk.signSession(
          { openId, appId: "sigar-demo", name },
          { expiresInMs }
        );
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, {
          ...cookieOptions,
          ...(input.remember ? { maxAge: expiresInMs } : {}),
        });
        return buildDemoUser(openId, name);
      }),
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
    requestPasswordReset: publicProcedure
      .input(z.object({ email: z.string().trim().email().max(320) }))
      .mutation(async ({ ctx, input }) => {
        const { reason } = await sendPasswordResetEmail(
          input.email,
          getPasswordResetRedirectUrl(ctx.req)
        );
        await recordSecurityEvent(ctx, {
          type: "password_reset_requested",
          email: input.email,
          reason,
        });
        // A resposta é sempre a mesma para não revelar se a conta existe.
        return { success: true } as const;
      }),
    validatePasswordReset: publicProcedure
      .input(z.object({ accessToken: recoveryAccessToken }))
      .mutation(async ({ ctx, input }) => {
        try {
          await verifyPasswordResetToken(input.accessToken);
        } catch (error) {
          await recordSecurityEvent(ctx, {
            type: "password_reset_failed",
            reason: passwordFailureReason(error),
          });
          throw error;
        }
        return { valid: true } as const;
      }),
    resetPassword: publicProcedure
      .input(
        z.object({
          accessToken: recoveryAccessToken,
          refreshToken: recoveryRefreshToken,
          password: passwordInput,
        })
      )
      .mutation(async ({ ctx, input }) => {
        assertNewPassword(input.password);
        let supabaseUser: Awaited<
          ReturnType<typeof resetPasswordWithRecoveryToken>
        >;
        try {
          supabaseUser = await resetPasswordWithRecoveryToken(
            input.accessToken,
            input.refreshToken,
            input.password
          );
        } catch (error) {
          await recordSecurityEvent(ctx, {
            type: "password_reset_failed",
            reason: passwordFailureReason(error),
          });
          throw error;
        }
        await recordSecurityEvent(ctx, {
          type: "password_reset_completed",
          openId: supabaseUser.id,
          email: supabaseUser.email,
        });
        return { success: true } as const;
      }),
    changePassword: protectedProcedure
      .input(
        z.object({
          currentPassword: passwordInput.min(1),
          newPassword: passwordInput,
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (isDemoOpenId(ctx.user.openId)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "A conta de demonstração não possui senha para alterar.",
          });
        }
        if (!ctx.user.email) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Esta conta não possui e-mail para confirmar a senha.",
          });
        }
        assertNewPassword(input.newPassword);
        if (input.newPassword === input.currentPassword) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: SAME_PASSWORD_ERROR,
          });
        }

        try {
          await changePasswordWithSupabase(
            ctx.user.email,
            input.currentPassword,
            input.newPassword
          );
        } catch (error) {
          await recordSecurityEvent(ctx, {
            type: "password_change_failed",
            userId: ctx.user.id,
            reason: passwordFailureReason(error),
          });
          throw error;
        }
        await recordSecurityEvent(ctx, {
          type: "password_change_completed",
          userId: ctx.user.id,
        });
        return { success: true } as const;
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
