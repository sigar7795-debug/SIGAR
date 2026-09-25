import { describe, expect, it } from "vitest";
import {
  getNewPasswordError,
  getPasswordConfirmationError,
} from "./passwordPolicy";

describe("password policy", () => {
  it("accepts passwords between 8 characters and the 72-byte bcrypt limit", () => {
    expect(getNewPasswordError("12345678")).toBeNull();
    expect(getNewPasswordError("a".repeat(72))).toBeNull();
  });

  it("rejects short passwords with a clear message", () => {
    expect(getNewPasswordError("1234567")).toBe(
      "A nova senha deve ter pelo menos 8 caracteres."
    );
  });

  it("counts bytes, not characters, for the upper limit", () => {
    expect(getNewPasswordError("a".repeat(73))).toMatch(/no máximo 72/);
    // 37 "ã" ocupam 74 bytes em UTF-8.
    expect(getNewPasswordError("ã".repeat(37))).toMatch(/no máximo 72/);
  });

  it("requires the confirmation to match", () => {
    expect(getPasswordConfirmationError("senha-nova", "senha-nova")).toBeNull();
    expect(getPasswordConfirmationError("senha-nova", "senha-outra")).toBe(
      "A confirmação não coincide com a nova senha."
    );
  });
});
