import { TRPCError } from "@trpc/server";
import { type EffectiveRole, getEffectiveRole, roleMeets } from "../db.js";

/** Exige o papel mínimo na propriedade (ver docs/membros-propriedade.md). */
export async function assertPropertyAccess(
  propertyId: number,
  userId: number,
  minRole: EffectiveRole
) {
  const role = await getEffectiveRole(propertyId, userId);
  if (!roleMeets(role, minRole)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Não tem acesso a esta propriedade.",
    });
  }
  return role as EffectiveRole;
}
