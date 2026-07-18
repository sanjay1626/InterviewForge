/**
 * Framework-independent Result type used across repositories and services so
 * that the domain layer never leaks Supabase/React Native error shapes into UI
 * code. UI code narrows on `ok` and renders success/error states accordingly.
 */
import type { AppError } from './errors';

export type Ok<T> = { ok: true; value: T };
export type Err = { ok: false; error: AppError };
export type Result<T> = Ok<T> | Err;

export function ok<T>(value: T): Ok<T> {
  return { ok: true, value };
}

export function err(error: AppError): Err {
  return { ok: false, error };
}

export function isOk<T>(result: Result<T>): result is Ok<T> {
  return result.ok;
}

export function isErr<T>(result: Result<T>): result is Err {
  return !result.ok;
}

/** Unwrap or throw — use only where an error is genuinely unexpected. */
export function unwrap<T>(result: Result<T>): T {
  if (result.ok) return result.value;
  throw new Error(result.error.message);
}
