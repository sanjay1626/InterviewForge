import { makeError, type AppError } from '@/core/domain/errors';

/**
 * Turns a `functions.invoke` failure into a specific, actionable AppError.
 *
 * Supabase wraps Edge Function failures (FunctionsHttpError) around the raw
 * Response, so the function's own `{ error: "..." }` body — and its status — are
 * only reachable by reading `error.context`. Without this, every failure looks
 * identical, which makes real problems (function not deployed, missing API key,
 * document not analyzed) impossible to tell apart.
 */
export async function describeFunctionError(
  error: unknown,
  functionName: string,
): Promise<AppError> {
  const wrapped = error as {
    name?: string;
    message?: string;
    context?: { status?: number; json?: () => Promise<unknown> };
  };

  let status = wrapped?.context?.status;
  let serverMessage = '';

  const readJson = wrapped?.context?.json;
  if (typeof readJson === 'function') {
    try {
      const body = (await readJson.call(wrapped.context)) as { error?: unknown };
      if (body && typeof body.error === 'string') serverMessage = body.error;
    } catch {
      // body already consumed or not JSON — fall back to status/message
    }
  }

  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.warn(`[${functionName}] invoke failed`, status, serverMessage || wrapped?.message);
  }

  // Network / function unreachable (not deployed, offline, bad URL).
  if (wrapped?.name === 'FunctionsFetchError' || status === 404) {
    return makeError(
      'network',
      `The "${functionName}" function isn't reachable. Deploy it with:\nsupabase functions deploy ${functionName}`,
      { retryable: true, cause: error },
    );
  }

  // The function ran but its provider key is missing.
  if (status === 501) {
    return makeError(
      'auth/not-configured',
      `"${functionName}" is deployed, but its AI provider key isn't set on Supabase.\n\n` +
        'Add it in Supabase Dashboard → Edge Functions → Secrets, or run:\n' +
        'supabase secrets set ANTHROPIC_API_KEY=sk-ant-...' +
        (serverMessage ? `\n\n(${serverMessage})` : ''),
      { cause: error },
    );
  }

  if (status === 401 || status === 403) {
    return makeError('permission', 'Your session expired. Sign in again and retry.', {
      cause: error,
    });
  }

  return makeError(
    'unknown',
    serverMessage || wrapped?.message || `The "${functionName}" function failed.`,
    { retryable: true, cause: error },
  );
}
