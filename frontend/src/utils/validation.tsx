// frontend/src/utils/validation.ts
export const EMAIL_ALLOWED = /^[A-Za-z0-9_.@]+$/;
export const USERNAME_ALLOWED = /^[A-Za-z0-9_]+$/; // sencillo y claro
const SPECIALS = /[!@#$%^&*()\-\_\=\+\[\]\{\};:,.<>?\/]/;

export type FieldErrors = {
  email?: string;
  username?: string;
  password?: string;
  confirm?: string;
};

export function validateEmail(raw: string): string | undefined {
  const v = raw ?? "";
  if (v.trim() !== v) return "El correo no puede tener espacios al inicio ni al final.";
  if (!EMAIL_ALLOWED.test(v)) return "Solo se permiten letras, dígitos y _ @ .";
  if (!v.includes("@")) return "El correo debe contener '@'.";
  if (v.includes("  ")) return "El correo no puede tener dobles espacios internos.";
  return undefined;
}

export function validateUsername(raw: string): string | undefined {
  const v = raw ?? "";
  if (v.trim() !== v) return "El usuario no puede tener espacios al inicio ni al final.";
  if (v.length < 3 || v.length > 20) return "El usuario debe tener entre 3 y 20 caracteres.";
  if (!USERNAME_ALLOWED.test(v)) return "Solo letras, dígitos y guion bajo (_).";
  return undefined;
}

export function validatePassword(pwRaw: string): string | undefined {
  const pw = pwRaw ?? "";
  if (pw.trim() !== pw) return "La contraseña no puede tener espacios al inicio ni al final.";
  if (pw.length < 8) return "Mínimo 8 caracteres.";
  if (!/[A-Z]/.test(pw)) return "Debe incluir al menos una mayúscula (A–Z).";
  if (!/[a-z]/.test(pw)) return "Debe incluir al menos una minúscula (a–z).";
  if (!/[0-9]/.test(pw)) return "Debe incluir al menos un número (0–9).";
  if (!SPECIALS.test(pw)) return "Debe incluir al menos un carácter especial (!@#$%^&*()-_=+[]{};:,.<>?/).";
  return undefined;
}

export function validateConfirmPassword(pw: string, confirm: string): string | undefined {
  if (!confirm) return "Repite la contraseña.";
  if (pw !== confirm) return "Las contraseñas no coinciden.";
  return undefined;
}
