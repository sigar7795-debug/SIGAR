import { describe, expect, it, vi } from "vitest";
import { ruralProperties } from "../drizzle/schema";
import { updatePropertyWithDb } from "./db";

describe("updatePropertyWithDb", () => {
  it("atualiza somente os campos cadastrais informados e preserva o vínculo de titularidade", async () => {
    const where = vi.fn().mockResolvedValue(undefined);
    const set = vi.fn(() => ({ where }));
    const update = vi.fn(() => ({ set }));
    const database = { update };
    const updatedAt = new Date("2026-09-11T04:00:00.000Z");
    const values = {
      name: "Fazenda Aurora Atualizada",
      municipality: "Uberaba",
      state: "MG",
      totalArea: "312.50",
      mainActivity: "Pecuária de corte",
      description: "Nova descrição.",
    };

    await updatePropertyWithDb(database, 8, values, updatedAt);

    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith(ruralProperties);
    expect(set).toHaveBeenCalledWith({ ...values, updatedAt });
    expect(Object.keys(set.mock.calls[0][0]).sort()).toEqual(
      ["description", "mainActivity", "municipality", "name", "state", "totalArea", "updatedAt"].sort()
    );
    expect(where).toHaveBeenCalledTimes(1);
  });
});
