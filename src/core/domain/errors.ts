/**
 * Domain error model. Independent of Supabase and React Native. Repositories
 * translate provider errors into these typed shapes so the rest of the app can
 * react by `code` (e.g. show a retry button on network errors).
 */

export type AppErrorCode =
  | 'network'
  | 'auth/invalid-credentials'
  | 'auth/email-in-use'
  | 'auth/weak-password'
  | 'auth/not-configured'
  | 'validation'
  | 'not-found'
  | 'permission'
  | 'unknown';

export interface AppError {
  code: AppErrorCode;
  message: string;
  /** True when the caller can reasonably retry the same operation. */
  retryable: boolean;
  /** Original provider error, kept for logging only (never shown to users). */
  cause?: unknown;
}

export function makeError(
  code: AppErrorCode,
  message: string,
  options: { retryable?: boolean; cause?: unknown } = {},
): AppError {
  const retryable = options.retryable ?? code === 'network';
  return { code, message, retryable, cause: options.cause };
}

/** User-facing message that never exposes internal details. */
export function toUserMessage(error: AppError): string {
  return error.message;
}

/** Shared error for mutations invoked without an authenticated/guest session. */
export function noSessionError(): AppError {
  return makeError('unknown', 'No active session.');
}
