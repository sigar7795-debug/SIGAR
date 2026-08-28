import { createExpressMiddleware } from "@trpc/server/adapters/express";
import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { registerOAuthRoutes } from "./_core/oauth";
import { registerStorageProxy } from "./_core/storageProxy";
import { createContext } from "./_core/context";
import { appRouter } from "./routers";

export function createApp() {
  const app = express();
  app.set("trust proxy", 1);
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  app.get("/api/health", (_req, res) => {
    res.status(200).json({ status: "ok", service: "sigar" });
  });

  registerStorageProxy(app);
  registerOAuthRoutes(app);
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  app.use(
    (error: unknown, _req: Request, res: Response, _next: NextFunction) => {
      console.error("[Server] Unhandled request error", error);
      res.status(500).json({ error: "Internal server error" });
    }
  );

  return app;
}
