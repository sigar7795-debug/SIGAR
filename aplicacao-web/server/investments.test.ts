import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const roleRank: Record<string, number> = {
  visualizador: 0,
  editor: 1,
  proprietario: 2,
};

const database = vi.hoisted(() => ({
  createInvestmentAlternative: vi.fn(),
  deleteInvestmentAlternative: vi.fn(),
  getEffectiveRole: vi.fn(),
  listInvestmentAlternatives: vi.fn(),
  listPropertyEntries: vi.fn(),
  roleMeets: (role: string | null, minRole: string) =>
    role !== null && roleRank[role] >= roleRank[minRole],
  updateInvestmentAlternative: vi.fn(),
}));

vi.mock("./db", () => database);

import { createDemoOpenId } from "./demo";
import { appRouter } from "./routers";

function createContext(openId = "user-42"): TrpcContext {
  return {
    user: {
      id: 42,
      openId,
      name: "Conta de teste",
      email: "gestor@example.com",
      loginMethod: "supabase-email",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {} as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

function alternativeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 5,
    propertyId: 8,
    createdById: 42,
    name: "CDB",
    description: null,
    initialAmount: "10000.00",
    monthlyContribution: "0.00",
    termMonths: 12,
    returnRate: "1.0000",
    ratePeriod: "mensal" as const,
    adminFeeRate: "0.0000",
    fixedCosts: "0.00",
    incomeTaxRate: "0.00",
    createdAt: new Date("2026-10-01T12:00:00.000Z"),
    updatedAt: new Date("2026-10-01T12:00:00.000Z"),
    ...overrides,
  };
}

function entryRow(
  entryType: string,
  amount: string,
  occurredOn: string,
  activity = "Pecuária de corte"
) {
  return {
    id: Math.floor(Math.random() * 10000),
    propertyId: 8,
    createdById: 42,
    entryType,
    category: "Geral",
    activity,
    description: "Lançamento de teste",
    occurredOn: new Date(`${occurredOn}T00:00:00.000Z`),
    dueOn: null,
    settlementStatus: "liquidado",
    settledOn: null,
    amount,
  };
}

const validAlternative = {
  propertyId: 8,
  name: "CDB 100% do CDI",
  initialAmount: 10000,
  monthlyContribution: 500,
  termMonths: 12,
  returnRate: 1,
  ratePeriod: "mensal" as const,
  adminFeeRate: 0,
  fixedCosts: 0,
  incomeTaxRate: 15,
};

describe("investimentos: permissões", () => {
  beforeEach(() => vi.resetAllMocks());

  it("exige sessão autenticada", async () => {
    const caller = appRouter.createCaller({
      ...createContext(),
      user: null,
    });

    await expect(
      caller.finance.investments.list({ propertyId: 8 })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(
      caller.finance.investments.compare({
        propertyId: 8,
        startMonth: "2025-10",
        endMonth: "2026-09",
        capital: 100000,
      })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("bloqueia quem não é membro da propriedade", async () => {
    database.getEffectiveRole.mockResolvedValue(null);
    const caller = appRouter.createCaller(createContext());

    await expect(
      caller.finance.investments.list({ propertyId: 8 })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      caller.finance.investments.compare({
        propertyId: 8,
        startMonth: "2025-10",
        endMonth: "2026-09",
        capital: 100000,
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(database.listInvestmentAlternatives).not.toHaveBeenCalled();
    expect(database.listPropertyEntries).not.toHaveBeenCalled();
  });

  it("deixa o visualizador consultar, mas não cadastrar, editar ou excluir", async () => {
    database.getEffectiveRole.mockResolvedValue("visualizador");
    database.listInvestmentAlternatives.mockResolvedValue([alternativeRow()]);
    const caller = appRouter.createCaller(createContext());

    const alternatives = await caller.finance.investments.list({
      propertyId: 8,
    });
    expect(alternatives[0].simulation).toMatchObject({
      netBalance: 11268.25,
      netReturn: 1268.25,
    });

    await expect(
      caller.finance.investments.create(validAlternative)
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      caller.finance.investments.update({
        ...validAlternative,
        alternativeId: 5,
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      caller.finance.investments.delete({ propertyId: 8, alternativeId: 5 })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(database.createInvestmentAlternative).not.toHaveBeenCalled();
    expect(database.updateInvestmentAlternative).not.toHaveBeenCalled();
    expect(database.deleteInvestmentAlternative).not.toHaveBeenCalled();
  });
});

describe("investimentos: cadastro de alternativas (RF26–RF28)", () => {
  beforeEach(() => vi.resetAllMocks());

  it("grava os parâmetros em decimal e devolve o retorno estimado", async () => {
    database.getEffectiveRole.mockResolvedValue("editor");
    database.createInvestmentAlternative.mockImplementation(async values =>
      alternativeRow({ id: 11, ...values })
    );
    const caller = appRouter.createCaller(createContext());

    const created = await caller.finance.investments.create({
      ...validAlternative,
      description: "  Liquidez diária  ",
      fixedCosts: 10.005,
    });

    expect(database.createInvestmentAlternative).toHaveBeenCalledWith({
      propertyId: 8,
      createdById: 42,
      name: "CDB 100% do CDI",
      description: "Liquidez diária",
      initialAmount: "10000.00",
      monthlyContribution: "500.00",
      termMonths: 12,
      returnRate: "1.0000",
      ratePeriod: "mensal",
      adminFeeRate: "0.0000",
      fixedCosts: "10.01",
      incomeTaxRate: "15.00",
    });
    expect(created.simulation).toMatchObject({
      totalContributed: 16000,
      grossBalance: 17609.5,
      incomeTax: 241.43,
      netBalance: 17368.07,
      netReturn: 1358.06,
    });
  });

  it("recusa valores negativos e prazos ou taxas fora dos limites (RN10)", async () => {
    database.getEffectiveRole.mockResolvedValue("proprietario");
    const caller = appRouter.createCaller(createContext());
    const invalidPayloads = [
      { initialAmount: -1 },
      { monthlyContribution: -50 },
      { fixedCosts: -0.01 },
      { termMonths: 0 },
      { termMonths: 361 },
      { termMonths: 12.5 },
      { returnRate: 100.01 },
      { returnRate: -0.5 },
      { adminFeeRate: 101 },
      { incomeTaxRate: -1 },
      { name: "X" },
      { initialAmount: 0, monthlyContribution: 0 },
      { initialAmount: 0.001, monthlyContribution: 0 },
    ];

    for (const payload of invalidPayloads) {
      await expect(
        caller.finance.investments.create({ ...validAlternative, ...payload })
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    }
    expect(database.createInvestmentAlternative).not.toHaveBeenCalled();
  });

  it("aceita só aportes mensais, sem valor inicial", async () => {
    database.getEffectiveRole.mockResolvedValue("editor");
    database.createInvestmentAlternative.mockImplementation(async values =>
      alternativeRow({ id: 12, ...values })
    );
    const caller = appRouter.createCaller(createContext());

    const created = await caller.finance.investments.create({
      ...validAlternative,
      initialAmount: 0,
      monthlyContribution: 1000,
      returnRate: 0.5,
      termMonths: 24,
      incomeTaxRate: 0,
    });

    expect(created.simulation).toMatchObject({
      totalContributed: 24000,
      netReturn: 1431.96,
    });
  });

  it("edita e exclui apenas alternativas da propriedade informada", async () => {
    database.getEffectiveRole.mockResolvedValue("editor");
    database.updateInvestmentAlternative.mockResolvedValueOnce(null);
    database.deleteInvestmentAlternative.mockResolvedValueOnce(null);
    const caller = appRouter.createCaller(createContext());

    await expect(
      caller.finance.investments.update({
        ...validAlternative,
        alternativeId: 99,
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(
      caller.finance.investments.delete({ propertyId: 8, alternativeId: 99 })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(database.updateInvestmentAlternative).toHaveBeenCalledWith(
      99,
      8,
      expect.objectContaining({ name: "CDB 100% do CDI" })
    );
    expect(database.deleteInvestmentAlternative).toHaveBeenCalledWith(99, 8);

    database.updateInvestmentAlternative.mockResolvedValueOnce(
      alternativeRow({ returnRate: "12.0000", ratePeriod: "anual" })
    );
    database.deleteInvestmentAlternative.mockResolvedValueOnce({ id: 5 });

    const updated = await caller.finance.investments.update({
      ...validAlternative,
      alternativeId: 5,
      returnRate: 12,
      ratePeriod: "anual",
    });
    expect(updated.simulation.netBalance).toBe(11200);
    await expect(
      caller.finance.investments.delete({ propertyId: 8, alternativeId: 5 })
    ).resolves.toEqual({ id: 5, deleted: true });
  });
});

describe("investimentos: comparação com a atividade rural (RF29, RF30, RN07)", () => {
  beforeEach(() => vi.resetAllMocks());

  it("usa os lançamentos de meses inteiros e o mesmo capital para todas as opções", async () => {
    database.getEffectiveRole.mockResolvedValue("visualizador");
    database.listPropertyEntries.mockResolvedValue([
      entryRow("receita", "50000.00", "2025-11-10"),
      entryRow("custo_variavel", "30000.00", "2026-01-15"),
    ]);
    database.listInvestmentAlternatives.mockResolvedValue([
      alternativeRow({ id: 7, name: "CDB", termMonths: 36 }),
      alternativeRow({ id: 8, name: "Poupança", returnRate: "0.5000" }),
    ]);
    const caller = appRouter.createCaller(createContext());

    const result = await caller.finance.investments.compare({
      propertyId: 8,
      startMonth: "2025-10",
      endMonth: "2026-09",
      capital: 100000,
    });

    expect(database.listPropertyEntries).toHaveBeenCalledWith(
      8,
      "2025-10-01",
      "2026-09-30"
    );
    expect(result.period).toMatchObject({ months: 12 });
    expect(result.rural).toMatchObject({ netProfit: 20000, returnRate: 20 });
    expect(result.opportunityCost).toEqual({
      value: 12682.5,
      alternativeId: 7,
      alternativeName: "CDB",
    });
    expect(result.economicProfit).toBe(7317.5);
    expect(result.verdict).toBe("rural");
    expect(result.timeline).toHaveLength(13);
  });

  it("restringe o resultado rural à atividade escolhida", async () => {
    database.getEffectiveRole.mockResolvedValue("proprietario");
    database.listPropertyEntries.mockResolvedValue([
      entryRow("receita", "8000.00", "2026-02-10", "Leite"),
      entryRow("custo_variavel", "3000.00", "2026-02-12", "Leite"),
      entryRow("receita", "40000.00", "2026-03-05", "Soja"),
    ]);
    database.listInvestmentAlternatives.mockResolvedValue([alternativeRow()]);
    const caller = appRouter.createCaller(createContext());

    const result = await caller.finance.investments.compare({
      propertyId: 8,
      startMonth: "2026-01",
      endMonth: "2026-06",
      capital: 50000,
      activity: "Leite",
    });

    expect(result.activity).toBe("Leite");
    expect(result.activities).toEqual(["Leite", "Soja"]);
    expect(result.rural).toMatchObject({
      netProfit: 5000,
      returnRate: 10,
      entryCount: 2,
    });
  });

  it("recusa período invertido, longo demais ou capital não positivo", async () => {
    database.getEffectiveRole.mockResolvedValue("proprietario");
    const caller = appRouter.createCaller(createContext());
    const base = {
      propertyId: 8,
      startMonth: "2025-10",
      endMonth: "2026-09",
      capital: 100000,
    };

    for (const payload of [
      { endMonth: "2025-09" },
      { startMonth: "2016-01", endMonth: "2026-01" },
      { startMonth: "2026-13" },
      { capital: 0 },
      { capital: -500 },
    ]) {
      await expect(
        caller.finance.investments.compare({ ...base, ...payload })
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    }
    expect(database.listPropertyEntries).not.toHaveBeenCalled();
  });
});

describe("investimentos: modo de demonstração", () => {
  beforeEach(() => vi.resetAllMocks());

  it("lista, cadastra, compara e exclui sem tocar no banco", async () => {
    const caller = appRouter.createCaller(
      createContext(createDemoOpenId("demonstracao@sigar.local"))
    );

    const initial = await caller.finance.investments.list({ propertyId: 1 });
    expect(initial.length).toBeGreaterThan(0);
    expect(initial.every(item => item.simulation.netReturn > 0)).toBe(true);

    const created = await caller.finance.investments.create({
      ...validAlternative,
      propertyId: 1,
    });
    const comparison = await caller.finance.investments.compare({
      propertyId: 1,
      startMonth: "2026-01",
      endMonth: "2026-12",
      capital: 500000,
    });
    expect(comparison.alternatives).toHaveLength(initial.length + 1);

    await caller.finance.investments.delete({
      propertyId: 1,
      alternativeId: created.id,
    });
    await expect(
      caller.finance.investments.list({ propertyId: 1 })
    ).resolves.toHaveLength(initial.length);
    expect(database.getEffectiveRole).not.toHaveBeenCalled();
    expect(database.createInvestmentAlternative).not.toHaveBeenCalled();
  });
});
