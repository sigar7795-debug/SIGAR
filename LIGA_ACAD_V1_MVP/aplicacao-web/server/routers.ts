import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { sdk } from "./_core/sdk";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { buildDemoUser, createDemoOpenId, getDemoName } from "./demo";
import { financeRouter } from "./routers/finance";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    demoLogin: publicProcedure
      .input(z.object({
        email: z.string().trim().email(),
        remember: z.boolean().default(true),
      }))
      .mutation(async ({ ctx, input }) => {
        const openId = createDemoOpenId(input.email);
        const name = getDemoName(input.email);
        const expiresInMs = input.remember ? ONE_YEAR_MS : 1000 * 60 * 60 * 8;
        const sessionToken = await sdk.signSession(
          { openId, appId: "sigar-demo", name },
          { expiresInMs },
        );
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, {
          ...cookieOptions,
          ...(input.remember ? { maxAge: expiresInMs } : {}),
        });
        return buildDemoUser(openId, name);
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
