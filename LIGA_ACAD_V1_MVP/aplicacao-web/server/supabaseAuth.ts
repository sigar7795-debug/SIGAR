import { createClient, type User as SupabaseUser } from "@supabase/supabase-js";
import { TRPCError } from "@trpc/server";
import { ENV } from "./_core/env";

function createAuthClient() {
  if (!ENV.supabaseUrl || !ENV.supabaseAnonKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "A autenticação do SIGAR ainda não foi configurada.",
    });
  }

  return createClient(ENV.supabaseUrl, ENV.supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

function authError(message: string, fallback: string) {
  const invalidCredentials = message.toLowerCase().includes("invalid login");
  return new TRPCError({
    code: invalidCredentials ? "UNAUTHORIZED" : "BAD_REQUEST",
    message: invalidCredentials ? "E-mail ou senha inválidos." : fallback,
  });
}

export async function signInWithSupabase(email: string, password: string) {
  const client = createAuthClient();
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    throw authError(error?.message ?? "", "Não foi possível entrar no SIGAR.");
  }

  return data.user;
}

export async function signUpWithSupabase(
  email: string,
  password: string,
  name: string
) {
  const client = createAuthClient();
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: { data: { name, full_name: name } },
  });

  if (error || !data.user) {
    throw authError(error?.message ?? "", "Não foi possível criar a conta.");
  }

  return {
    user: data.user,
    requiresEmailConfirmation: !data.session,
  };
}

export function getSupabaseUserName(user: SupabaseUser) {
  const metadataName =
    user.user_metadata?.full_name ?? user.user_metadata?.name;
  if (typeof metadataName === "string" && metadataName.trim()) {
    return metadataName.trim();
  }

  return user.email?.split("@")[0] || "Usuário SIGAR";
}
