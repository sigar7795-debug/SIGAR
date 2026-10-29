import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const roleRank: Record<string, number> = {
  visualizador: 0,
  editor: 1,
  proprietario: 2,
};

const database = vi.hoisted(() => ({
  acceptInvite: vi.fn(),
  createFinancialEntry: vi.fn(),
  createOrRefreshInvite: vi.fn(),
  declineInvite: vi.fn(),
  getEffectiveRole: vi.fn(),
  listPendingInvitesForEmail: vi.fn(),
  listPropertyMembers: vi.fn(),
  revokeMember: vi.fn(),
  roleMeets: (role: string | null, minRole: string) =>
    role !== null && roleRank[role] >= roleRank[minRole],
  updateMemberRole: vi.fn(),
}));

vi.mock("./db", () => database);

import { appRouter } from "./routers";

function createContext(overrides: Partial<TrpcContext["user"]> = {}): TrpcContext {
  return {
    user: {
      id: 42,
      openId: "member-42",
      name: "Conta de teste",
      email: "membro@example.com",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
      ...overrides,
    },
    req: {} as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("permissão efetiva de membros de propriedade", () => {
  beforeEach(() => vi.resetAllMocks());

  it("impede quem não é membro de ler lançamentos, painel e a lista de membros", async () => {
    database.getEffectiveRole.mockResolvedValue(null);
    const caller = appRouter.createCaller(createContext());

    await expect(
      caller.finance.entries.list({
        propertyId: 8,
        range: "mes",
        referenceDate: "2026-08-19",
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    await expect(
      caller.finance.dashboard.summary({
        propertyId: 8,
        range: "mes",
        referenceDate: "2026-08-19",
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    await expect(
      caller.finance.members.list({ propertyId: 8 })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("impede um visualizador de lançar despesas ou convidar membros", async () => {
    database.getEffectiveRole.mockResolvedValue("visualizador");
    const caller = appRouter.createCaller(createContext());

    await expect(
      caller.finance.entries.create({
        propertyId: 8,
        entryType: "receita",
        category: "Venda",
        activity: "Pecuária",
        description: "Lote de agosto",
        occurredOn: "2026-08-19",
        amount: 100,
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(database.createFinancialEntry).not.toHaveBeenCalled();

    await expect(
      caller.finance.members.invite({
        propertyId: 8,
        email: "novo@example.com",
        role: "editor",
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("permite a um editor lançar despesas mas não gerir membros", async () => {
    database.getEffectiveRole.mockResolvedValue("editor");
    database.createFinancialEntry.mockResolvedValue({ id: 1, propertyId: 8 });
    const caller = appRouter.createCaller(createContext());

    await expect(
      caller.finance.entries.create({
        propertyId: 8,
        entryType: "receita",
        category: "Venda",
        activity: "Pecuária",
        description: "Lote de agosto",
        occurredOn: "2026-08-19",
        amount: 100,
      })
    ).resolves.toMatchObject({ id: 1 });

    await expect(
      caller.finance.members.invite({
        propertyId: 8,
        email: "novo@example.com",
        role: "visualizador",
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(database.createOrRefreshInvite).not.toHaveBeenCalled();

    await expect(
      caller.finance.members.revoke({ propertyId: 8, memberId: 3 })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    await expect(
      caller.finance.members.updateRole({
        propertyId: 8,
        memberId: 3,
        role: "editor",
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("só um proprietário consegue convidar, alterar papel e revogar membros", async () => {
    database.getEffectiveRole.mockResolvedValue("proprietario");
    database.createOrRefreshInvite.mockResolvedValue([]);
    database.updateMemberRole.mockResolvedValue({ id: 3 });
    database.listPropertyMembers.mockResolvedValue([]);
    database.revokeMember.mockResolvedValue({ id: 3 });
    const caller = appRouter.createCaller(createContext());

    await expect(
      caller.finance.members.invite({
        propertyId: 8,
        email: "novo@example.com",
        role: "editor",
      })
    ).resolves.toEqual([]);
    expect(database.createOrRefreshInvite).toHaveBeenCalledWith(
      8,
      "novo@example.com",
      "editor",
      42
    );

    await expect(
      caller.finance.members.updateRole({
        propertyId: 8,
        memberId: 3,
        role: "visualizador",
      })
    ).resolves.toEqual([]);

    await expect(
      caller.finance.members.revoke({ propertyId: 8, memberId: 3 })
    ).resolves.toEqual([]);
  });

  it("só aceita um convite quando o e-mail da conta autenticada coincide com o convite pendente", async () => {
    database.acceptInvite.mockResolvedValue(null);
    const caller = appRouter.createCaller(
      createContext({ email: "outra-conta@example.com" })
    );

    await expect(
      caller.finance.members.acceptInvite({ memberId: 3 })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(database.acceptInvite).toHaveBeenCalledWith(
      3,
      42,
      "outra-conta@example.com"
    );
  });

  it("recusa um convite pendente sem alterar a titularidade da propriedade", async () => {
    database.declineInvite.mockResolvedValue({ id: 3 });
    const caller = appRouter.createCaller(createContext());

    await expect(
      caller.finance.members.declineInvite({ memberId: 3 })
    ).resolves.toEqual({ id: 3, declined: true });
  });
});
