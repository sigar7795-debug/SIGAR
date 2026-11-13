import { describe, expect, it } from "vitest";
import {
  diffModuleOverrides,
  hasModule,
  moduleIds,
  PERSONA_MODULES,
  profileRoles,
  resolveModules,
} from "./modules";

describe("módulos por perfil", () => {
  it("aplica a predefinição do perfil quando não há ajustes", () => {
    for (const role of profileRoles) {
      expect(resolveModules(role, {})).toEqual([...PERSONA_MODULES[role]]);
    }
    expect(resolveModules("produtor")).toEqual([]);
    expect(resolveModules("gestor")).toEqual([...moduleIds]);
  });

  it("deixa tudo disponível enquanto o perfil não foi definido", () => {
    expect(resolveModules(null)).toEqual([...moduleIds]);
    expect(resolveModules(undefined, null)).toEqual([...moduleIds]);
  });

  it("permite a um produtor ligar um módulo sem mudar de perfil", () => {
    expect(resolveModules("produtor", { fluxo_caixa: true })).toEqual([
      "fluxo_caixa",
    ]);
    expect(hasModule("produtor", { fluxo_caixa: true }, "fluxo_caixa")).toBe(
      true
    );
    expect(hasModule("produtor", { fluxo_caixa: true }, "investimentos")).toBe(
      false
    );
  });

  it("permite a um gestor desligar um módulo da predefinição", () => {
    expect(resolveModules("gestor", { investimentos: false })).toEqual([
      "fluxo_caixa",
    ]);
  });

  it("ignora ajustes desconhecidos ou com valor inválido", () => {
    const overrides = { relatorios: true, fluxo_caixa: "sim" } as never;
    expect(resolveModules("produtor", overrides)).toEqual([]);
    expect(resolveModules("gestor", overrides)).toEqual([...moduleIds]);
  });

  it("grava apenas a diferença face à predefinição", () => {
    expect(diffModuleOverrides("produtor", [])).toEqual({});
    expect(diffModuleOverrides("produtor", ["fluxo_caixa"])).toEqual({
      fluxo_caixa: true,
    });
    expect(diffModuleOverrides("gestor", [...moduleIds])).toEqual({});
    expect(diffModuleOverrides("gestor", ["fluxo_caixa"])).toEqual({
      investimentos: false,
    });
  });

  it("faz o percurso de ida e volta entre lista ligada e ajustes", () => {
    for (const role of profileRoles) {
      for (const enabled of [[], ["fluxo_caixa"], ["investimentos"], [...moduleIds]] as const) {
        expect(
          resolveModules(role, diffModuleOverrides(role, enabled))
        ).toEqual([...enabled]);
      }
    }
  });
});
