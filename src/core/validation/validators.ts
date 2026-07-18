/**
 * Pure input validators shared by forms. Framework-independent and easy to
 * unit test. Each returns an error string or null (valid).
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return 'Email is required.';
  if (!EMAIL_RE.test(trimmed)) return 'Enter a valid email address.';
  return null;
}

export function validatePassword(value: string): string | null {
  if (!value) return 'Password is required.';
  if (value.length < 8) return 'Password must be at least 8 characters.';
  return null;
}

export function validateConfirmPassword(
  password: string,
  confirm: string,
): string | null {
  if (!confirm) return 'Please confirm your password.';
  if (password !== confirm) return 'Passwords do not match.';
  return null;
}

export function validateRequired(value: string, label: string): string | null {
  if (!value.trim()) return `${label} is required.`;
  return null;
}

/** True when every value in the record is null (no errors). */
export function isFormValid(errors: Record<string, string | null>): boolean {
  return Object.values(errors).every((e) => e === null);
}
