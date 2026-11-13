import { trpc } from "@/lib/trpc";
import { type ModuleId, resolveModules } from "@shared/modules";
import { useMemo } from "react";

/** Módulos ligados para a conta autenticada (predefinição do perfil + ajustes em /perfil). */
export function useModules() {
  const profileQuery = trpc.finance.profile.get.useQuery();
  const profile = profileQuery.data;

  return useMemo(() => {
    // Enquanto o perfil carrega, nenhum módulo é dado como ligado: os itens
    // aparecem depois, em vez de aparecerem e sumirem.
    const modules = profileQuery.isSuccess
      ? resolveModules(profile?.profileRole, profile?.moduleOverrides)
      : [];
    return {
      modules,
      hasModule: (moduleId: ModuleId) => modules.includes(moduleId),
      isLoading: profileQuery.isLoading,
      isError: profileQuery.isError,
      refetch: profileQuery.refetch,
    };
  }, [
    profile?.profileRole,
    profile?.moduleOverrides,
    profileQuery.isSuccess,
    profileQuery.isLoading,
    profileQuery.isError,
    profileQuery.refetch,
  ]);
}
