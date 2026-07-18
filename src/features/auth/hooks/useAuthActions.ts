import { useMutation } from '@tanstack/react-query';

import type { AppError } from '@/core/domain/errors';
import type { AuthSession, Credentials } from '../domain/types';
import { useAuthRepository } from '../AuthProvider';
import { useAuthStore } from '../store/auth-store';

/**
 * Mutation hooks for the auth actions. Each unwraps the repository Result: on
 * success it updates the session store; on failure it throws the typed AppError
 * so screens can render inline error state and offer retry where appropriate.
 */
function unwrapSession(result: {
  ok: boolean;
  value?: AuthSession;
  error?: AppError;
}): AuthSession {
  if (result.ok && result.value) return result.value;
  throw result.error ?? { code: 'unknown', message: 'Unknown error', retryable: false };
}

export function useSignIn() {
  const repo = useAuthRepository();
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation<AuthSession, AppError, Credentials>({
    mutationFn: async (credentials) => unwrapSession(await repo.signIn(credentials)),
    onSuccess: (session) => setSession(session),
  });
}

export function useSignUp() {
  const repo = useAuthRepository();
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation<AuthSession, AppError, Credentials>({
    mutationFn: async (credentials) => unwrapSession(await repo.signUp(credentials)),
    onSuccess: (session) => setSession(session),
  });
}

export function useSignInAsGuest() {
  const repo = useAuthRepository();
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation<AuthSession, AppError, void>({
    mutationFn: async () => unwrapSession(await repo.signInAsGuest()),
    onSuccess: (session) => setSession(session),
  });
}

export function useSignOut() {
  const repo = useAuthRepository();
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation<void, AppError, void>({
    mutationFn: async () => {
      const result = await repo.signOut();
      if (!result.ok) throw result.error;
    },
    onSuccess: () => setSession(null),
  });
}
