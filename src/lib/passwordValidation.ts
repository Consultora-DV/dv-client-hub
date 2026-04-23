export const MIN_PASSWORD_LENGTH = 8;

export function isPasswordValid(p: string): boolean {
  return (
    p.length >= MIN_PASSWORD_LENGTH &&
    /\d/.test(p) &&
    /[A-Z]/.test(p) &&
    /[^A-Za-z0-9]/.test(p)
  );
}

export const PASSWORD_ERROR_MSG =
  `Mínimo ${MIN_PASSWORD_LENGTH} caracteres, 1 mayúscula, 1 número y 1 símbolo especial`;
