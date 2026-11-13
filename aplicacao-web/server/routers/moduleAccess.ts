import { TRPCError } from "@trpc/server";
import { hasModule, MODULES, type ModuleId } from "../../shared/modules.js";
import { protectedProcedure } from "../_core/trpc.js";
import { getUserProfile } from "../db.js";

/**
 * Procedimento autenticado que exige o módulo ligado para a conta
 * (predefinição do perfil + ajustes feitos em /perfil, ver shared/modules.ts).
 */
export function moduleProcedure(moduleId: ModuleId) {
  return protectedProcedure.use(async ({ ctx, next }) => {
    const profile = await getUserProfile(ctx.user.id);
    if (!hasModule(profile?.profileRole, profile?.moduleOverrides, moduleId)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `O módulo ${MODULES[moduleId].label} está desativado. Ative-o em Meu perfil.`,
      });
    }
    return next();
  });
}
