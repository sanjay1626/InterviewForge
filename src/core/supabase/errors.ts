import { makeError, type AppError } from '@/core/domain/errors';

/** Translate a PostgREST error into a typed domain error. */
export function mapPostgrestError(
  message: string,
  code?: string,
  cause?: unknown,
): AppError {
  if (code === 'PGRST116') {
    return makeError('not-found', 'Not found.', { cause });
  }
  const lower = (message ?? '').toLowerCase();
  if (lower.includes('network') || lower.includes('fetch') || lower.includes('timeout')) {
    return makeError('network', 'Network error. Please retry.', {
      retryable: true,
      cause,
    });
  }
  if (lower.includes('row-level security') || lower.includes('permission')) {
    return makeError('permission', 'You do not have access to this item.', {
      cause,
    });
  }
  return makeError('unknown', message || 'Database error.', { cause });
}

/** Translate a Storage error into a typed domain error. */
export function mapStorageError(message: string, cause?: unknown): AppError {
  const lower = (message ?? '').toLowerCase();
  if (lower.includes('network') || lower.includes('fetch')) {
    return makeError('network', 'Upload failed — network error. Please retry.', {
      retryable: true,
      cause,
    });
  }
  if (lower.includes('bucket') && lower.includes('not found')) {
    return makeError(
      'unknown',
      'Storage bucket "documents" not found. Create it in Supabase (see setup guide).',
      { cause },
    );
  }
  return makeError('unknown', message || 'Upload failed.', { cause });
}
