import { describe, expect, it } from "vitest";
import { roleMeets } from "./db";

describe("roleMeets", () => {
  it("ordena os papéis por hierarquia proprietario > editor > visualizador", () => {
    expect(roleMeets("proprietario", "visualizador")).toBe(true);
    expect(roleMeets("proprietario", "editor")).toBe(true);
    expect(roleMeets("proprietario", "proprietario")).toBe(true);
    expect(roleMeets("editor", "visualizador")).toBe(true);
    expect(roleMeets("editor", "editor")).toBe(true);
    expect(roleMeets("editor", "proprietario")).toBe(false);
    expect(roleMeets("visualizador", "visualizador")).toBe(true);
    expect(roleMeets("visualizador", "editor")).toBe(false);
    expect(roleMeets("visualizador", "proprietario")).toBe(false);
  });

  it("nega acesso quando não há papel efetivo", () => {
    expect(roleMeets(null, "visualizador")).toBe(false);
  });
});
