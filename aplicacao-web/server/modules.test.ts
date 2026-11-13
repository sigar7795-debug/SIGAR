import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const database = vi.hoisted(() => ({
  createFinancialEntry: vi.fn(),
  getEffectiveRole: vi.fn(),
  getUserProfile: vi.fn(),
  listInvestmentAlternatives: vi.fn(),
  listPropertyEntries: vi.fn(),
  roleMeets: (role: string | null) => role !== null,
  saveUserProfile: vi.fn(),
}));

vi.mock("./db", () => database);

import { appRouter } from "./routers";

function createContext(): TrpcContext {
  return {
    user: {
      id: 42,
      openId: "user-42",
      name: "Conta de teste",
      email: "conta@example.com",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {} as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

const entryInput = {
  propertyId: 8,
  entryType: "receita" as const,
  category: "Venda de produção",
  activity: "Leite",
  description: "Venda de leite",
  occurredOn: "2026-08-19",
  amount: 12500,
};

const periodInput = {
  propertyId: 8,
  range: "mes" as const,
  referenceDate: "2026-08-19",
};

describe("módulos por perfil no servidor", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    database.getEffectiveRole.mockResolvedValue("proprietario");
    database.listInvestmentAlternatives.mockResolvedValue([]);
    database.listPropertyEntries.mockResolvedValue([]);
    database.createFinancialEntry.mockResolvedValue({ id: 15 });
  });

  it("bloqueia os módulos que a predefinição do produtor não inclui", async () => {
    database.getUserProfile.mockResolvedValue({
      profileRole: "produtor",
      moduleOverrides: {},
    });
    const caller = appRouter.createCaller(createContext());

    await expect(
      caller.finance.entries.create(entryInput)
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      caller.finance.investments.list({ propertyId: 8 })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(database.createFinancialEntry).not.toHaveBeenCalled();
    expect(database.listInvestmentAlternatives).not.toHaveBeenCalled();
  });

  it("mantém a leitura do escopo geral para um produtor sem módulos", async () => {
    database.getUserProfile.mockResolvedValue({
      profileRole: "produtor",
      moduleOverrides: {},
    });
    const caller = appRouter.createCaller(createContext());

    await expect(
      caller.finance.entries.list(periodInput)
    ).resolves.toMatchObject({ entries: [] });
    await expect(
      caller.finance.dashboard.summary(periodInput)
    ).resolves.toHaveProperty("summary");
  });

  it("libera só o módulo que o produtor ligou em /perfil", async () => {
    database.getUserProfile.mockResolvedValue({
      profileRole: "produtor",
      moduleOverrides: { fluxo_caixa: true },
    });
    const caller = appRouter.createCaller(createContext());

    await expect(
      caller.finance.entries.create(entryInput)
    ).resolves.toMatchObject({ id: 15 });
    await expect(
      caller.finance.investments.list({ propertyId: 8 })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("bloqueia o módulo que um gestor desligou", async () => {
    database.getUserProfile.mockResolvedValue({
      profileRole: "gestor",
      moduleOverrides: { investimentos: false },
    });
    const caller = appRouter.createCaller(createContext());

    await expect(
      caller.finance.entries.create(entryInput)
    ).resolves.toMatchObject({ id: 15 });
    await expect(
      caller.finance.investments.list({ propertyId: 8 })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("não restringe contas que ainda não definiram o perfil", async () => {
    database.getUserProfile.mockResolvedValue(null);
    const caller = appRouter.createCaller(createContext());

    await expect(
      caller.finance.entries.create(entryInput)
    ).resolves.toMatchObject({ id: 15 });
    await expect(
      caller.finance.investments.list({ propertyId: 8 })
    ).resolves.toBeDefined();
  });

  it("grava apenas a diferença face à predefinição do perfil", async () => {
    const caller = appRouter.createCaller(createContext());

    await caller.finance.profile.save({
      profileRole: "produtor",
      enabledModules: ["fluxo_caixa"],
    });
    expect(database.saveUserProfile).toHaveBeenLastCalledWith(42, "produtor", {
      fluxo_caixa: true,
    });

    await caller.finance.profile.save({
      profileRole: "gestor",
      enabledModules: ["fluxo_caixa", "investimentos"],
    });
    expect(database.saveUserProfile).toHaveBeenLastCalledWith(42, "gestor", {});

    await caller.finance.profile.save({ profileRole: "gestor" });
    expect(database.saveUserProfile).toHaveBeenLastCalledWith(
      42,
      "gestor",
      undefined
    );
  });

  it("recusa módulos desconhecidos ao salvar o perfil", async () => {
    const caller = appRouter.createCaller(createContext());

    await expect(
      caller.finance.profile.save({
        profileRole: "produtor",
        enabledModules: ["relatorios" as never],
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(database.saveUserProfile).not.toHaveBeenCalled();
  });
});
