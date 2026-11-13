/**
 * Módulos da plataforma e predefinição por perfil.
 *
 * O perfil (persona) só define o ponto de partida: quais módulos vêm ligados.
 * O utilizador ajusta em /perfil e apenas a diferença face à predefinição é
 * gravada em `userProfiles.moduleOverrides`. O código pergunta sempre "tem o
 * módulo X?", nunca "é gestor?" — um perfil com um módulo extra não é um
 * novo tipo de utilizador.
 *
 * Visão geral, Propriedades e Meu perfil são o escopo geral: não são módulos
 * e ficam sempre disponíveis.
 */

export const profileRoles = [
  "produtor",
  "gestor",
  "estudante",
  "consultor",
  "administrador",
] as const;
export type ProfileRole = (typeof profileRoles)[number];

export const moduleIds = ["fluxo_caixa", "investimentos"] as const;
export type ModuleId = (typeof moduleIds)[number];

export const MODULES: Record<
  ModuleId,
  { label: string; description: string; path: string }
> = {
  fluxo_caixa: {
    label: "Fluxo de caixa",
    description: "Lançar e acompanhar receitas, custos e despesas.",
    path: "/fluxo-de-caixa",
  },
  investimentos: {
    label: "Investimentos",
    description:
      "Simular alternativas e comparar com o resultado da atividade rural.",
    path: "/investimentos",
  },
};

/** Módulos que cada perfil recebe ligados por omissão. */
export const PERSONA_MODULES: Record<ProfileRole, readonly ModuleId[]> = {
  produtor: [],
  gestor: ["fluxo_caixa", "investimentos"],
  estudante: ["fluxo_caixa", "investimentos"],
  consultor: ["fluxo_caixa", "investimentos"],
  administrador: ["fluxo_caixa", "investimentos"],
};

/** Só o que o utilizador ligou (`true`) ou desligou (`false`) face à predefinição. */
export type ModuleOverrides = Partial<Record<ModuleId, boolean>>;

/**
 * Módulos efetivos de uma conta. Sem perfil definido não há predefinição a
 * aplicar, por isso tudo fica disponível até o utilizador escolher um.
 */
export function resolveModules(
  role: ProfileRole | null | undefined,
  overrides?: ModuleOverrides | null
): ModuleId[] {
  const preset: readonly ModuleId[] =
    (role ? PERSONA_MODULES[role] : undefined) ?? moduleIds;
  return moduleIds.filter(id => {
    const override = overrides?.[id];
    return typeof override === "boolean" ? override : preset.includes(id);
  });
}

export function hasModule(
  role: ProfileRole | null | undefined,
  overrides: ModuleOverrides | null | undefined,
  moduleId: ModuleId
) {
  return resolveModules(role, overrides).includes(moduleId);
}

/** Converte a lista de módulos ligados na diferença face à predefinição do perfil. */
export function diffModuleOverrides(
  role: ProfileRole,
  enabled: readonly ModuleId[]
): ModuleOverrides {
  const preset = PERSONA_MODULES[role];
  const overrides: ModuleOverrides = {};
  for (const id of moduleIds) {
    const isEnabled = enabled.includes(id);
    if (isEnabled !== preset.includes(id)) overrides[id] = isEnabled;
  }
  return overrides;
}
