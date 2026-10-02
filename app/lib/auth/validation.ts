/** Shared validation only. No database or secret configuration belongs here. */
export function ageFromBirthDate(value: unknown, today = new Date()): number | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  if (year < 1900 || date > today) return null;
  let age = today.getUTCFullYear() - year;
  if (today.getUTCMonth() + 1 < month || (today.getUTCMonth() + 1 === month && today.getUTCDate() < day)) age--;
  return age;
}
export function isAdult(value: unknown, today = new Date()) {
  const age = ageFromBirthDate(value, today);
  return age !== null && age >= 18;
}
export function passwordProblem(password: string): string | null {
  if (password.length < 10) return "Use at least 10 characters.";
  if (password.length > 128) return "Use no more than 128 characters.";
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password) || !/[^a-zA-Z0-9]/.test(password)) return "Include uppercase, lowercase, a number, and a symbol.";
  return null;
}
export function safeNext(value: string | null): string {
  return ["/", "/explore", "/message", "/profile", "/settings", "/account/security"].includes(value || "") ? value! : "/";
}
export function validHandle(value: unknown): value is string {
  return typeof value === "string" && /^[a-zA-Z0-9_]{3,25}$/.test(value);
}