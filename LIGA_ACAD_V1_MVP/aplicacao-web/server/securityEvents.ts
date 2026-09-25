import { createHmac } from "node:crypto";
import type { SecurityEventType } from "../drizzle/schema.js";
import type { TrpcContext } from "./_core/context.js";
import { ENV } from "./_core/env.js";
import * as db from "./db.js";

export type SecurityEvent = {
  type: SecurityEventType;
  /** Conta local já conhecida (ex.: utilizador autenticado). */
  userId?: number | null;
  /** Id do Supabase, resolvido para a conta local quando existir. */
  openId?: string | null;
  email?: string | null;
  /** Código curto e fixo (ex.: "expired_token"); nunca mensagens do provedor. */
  reason?: string | null;
};

/** HMAC do e-mail: correlaciona pedidos sem guardar o endereço em claro. */
export function hashEmailForAudit(email: string) {
  return createHmac("sha256", ENV.cookieSecret || "sigar-security-events")
    .update(email.trim().toLowerCase())
    .digest("hex");
}

/**
 * Regista o evento sem interromper o fluxo do utilizador: uma falha de
 * auditoria nunca deve impedir a troca de senha nem revelar detalhes.
 */
export async function recordSecurityEvent(
  ctx: Pick<TrpcContext, "req">,
  event: SecurityEvent
) {
  const entry = {
    eventType: event.type,
    userId: event.userId ?? null,
    emailHash: event.email ? hashEmailForAudit(event.email) : null,
    reason: event.reason ?? null,
    ipAddress: ctx.req.ip?.slice(0, 64) ?? null,
  };

  try {
    if (entry.userId === null && event.openId) {
      entry.userId = (await db.getUserByOpenId(event.openId))?.id ?? null;
    }
    await db.insertSecurityEvent(entry);
  } catch {
    console.warn("[Security] Failed to persist security event", {
      eventType: entry.eventType,
      reason: entry.reason,
    });
  }
}
