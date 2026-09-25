export const PASSWORD_MIN_LENGTH = 8;
// O Supabase Auth usa bcrypt, que só considera os primeiros 72 bytes.
export const PASSWORD_MAX_BYTES = 72;

export const SAME_PASSWORD_ERROR =
  "A nova senha deve ser diferente da senha atual.";

export function getNewPasswordError(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `A nova senha deve ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`;
  }
  if (new TextEncoder().encode(password).length > PASSWORD_MAX_BYTES) {
    return `A nova senha deve ter no máximo ${PASSWORD_MAX_BYTES} caracteres.`;
  }
  return null;
}

export function getPasswordConfirmationError(
  password: string,
  confirmation: string
): string | null {
  return password === confirmation
    ? null
    : "A confirmação não coincide com a nova senha.";
}
