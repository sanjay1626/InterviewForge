import type { Session } from '@supabase/supabase-js';

import { makeError } from '@/core/domain/errors';
import { err, ok, type Result } from '@/core/domain/result';
import type { TypedSupabaseClient } from '@/core/supabase/client';
import type { AuthSession, Credentials } from '../domain/types';

/** Maps a Supabase session into the framework-independent domain shape. */
export function mapSession(session: Session | null): AuthSession | null {
  if (!session?.user) return null;
  return {
    user: {
      id: session.user.id,
      email: session.user.email ?? null,
      mode: 'password',
    },
    accessToken: session.access_token ?? null,
  };
}

/** Translates a Supabase auth error message into a typed domain error. */
function mapAuthError(message: string, cause?: unknown) {
  const lower = message.toLowerCase();
  if (lower.includes('invalid login') || lower.includes('invalid credentials')) {
    return makeError('auth/invalid-credentials', 'Incorrect email or password.', {
      cause,
    });
  }
  if (lower.includes('already registered') || lower.includes('already been registered')) {
    return makeError('auth/email-in-use', 'That email is already registered.', {
      cause,
    });
  }
  if (lower.includes('password') && lower.includes('least')) {
    return makeError('auth/weak-password', 'Password is too weak.', { cause });
  }
  if (lower.includes('network') || lower.includes('fetch')) {
    return makeError('network', 'Network error. Check your connection and retry.', {
      retryable: true,
      cause,
    });
  }
  return makeError('unknown', message || 'Authentication failed.', { cause });
}

/**
 * Supabase-backed auth. Accepts the client via constructor so it can be unit
 * tested with a fake client and stays decoupled from the singleton.
 */
export class SupabaseAuthRepository {
  constructor(private readonly client: TypedSupabaseClient) {}

  async getSession(): Promise<Result<AuthSession | null>> {
    const { data, error } = await this.client.auth.getSession();
    if (error) return err(mapAuthError(error.message, error));
    return ok(mapSession(data.session));
  }

  async signUp({ email, password }: Credentials): Promise<Result<AuthSession>> {
    const { data, error } = await this.client.auth.signUp({ email, password });
    if (error) return err(mapAuthError(error.message, error));
    const mapped = mapSession(data.session);
    if (!mapped) {
      // Email confirmation is enabled: no session is returned until confirmed.
      return err(
        makeError(
          'unknown',
          'Account created. Please confirm your email, then sign in.',
        ),
      );
    }
    return ok(mapped);
  }

  async signIn({ email, password }: Credentials): Promise<Result<AuthSession>> {
    const { data, error } = await this.client.auth.signInWithPassword({
      email,
      password,
    });
    if (error) return err(mapAuthError(error.message, error));
    const mapped = mapSession(data.session);
    if (!mapped) return err(makeError('unknown', 'Sign in failed.'));
    return ok(mapped);
  }

  async signOut(): Promise<Result<void>> {
    const { error } = await this.client.auth.signOut();
    if (error) return err(mapAuthError(error.message, error));
    return ok(undefined);
  }

  onAuthStateChange(callback: (session: AuthSession | null) => void): () => void {
    const { data } = this.client.auth.onAuthStateChange((_event, session) => {
      callback(mapSession(session));
    });
    return () => data.subscription.unsubscribe();
  }
}
