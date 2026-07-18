import { makeError } from '@/core/domain/errors';
import { err, ok, type Result } from '@/core/domain/result';
import type { TypedSupabaseClient } from '@/core/supabase/client';
import type { AuthSession, Credentials } from '../domain/types';
import type { AuthRepository } from './auth-repository';
import {
  clearGuest,
  guestSession,
  isGuestActive,
  markGuestActive,
} from './guest-session';
import { SupabaseAuthRepository } from './supabase-auth-repository';

const NOT_CONFIGURED = makeError(
  'auth/not-configured',
  'Cloud accounts are unavailable — Supabase is not configured. You can continue as a guest.',
);

/**
 * Facade that unifies guest (local) and Supabase (cloud) auth behind the single
 * AuthRepository contract. Guest mode always works; password methods require a
 * configured Supabase client and otherwise return a typed not-configured error.
 */
export class CompositeAuthRepository implements AuthRepository {
  private readonly supabase: SupabaseAuthRepository | null;

  constructor(client: TypedSupabaseClient | null) {
    this.supabase = client ? new SupabaseAuthRepository(client) : null;
  }

  async getSession(): Promise<Result<AuthSession | null>> {
    if (await isGuestActive()) return ok(guestSession);
    if (!this.supabase) return ok(null);
    return this.supabase.getSession();
  }

  async signUp(credentials: Credentials): Promise<Result<AuthSession>> {
    if (!this.supabase) return err(NOT_CONFIGURED);
    await clearGuest();
    return this.supabase.signUp(credentials);
  }

  async signIn(credentials: Credentials): Promise<Result<AuthSession>> {
    if (!this.supabase) return err(NOT_CONFIGURED);
    await clearGuest();
    return this.supabase.signIn(credentials);
  }

  async signInAsGuest(): Promise<Result<AuthSession>> {
    await markGuestActive();
    return ok(guestSession);
  }

  async signOut(): Promise<Result<void>> {
    const wasGuest = await isGuestActive();
    await clearGuest();
    if (wasGuest || !this.supabase) return ok(undefined);
    return this.supabase.signOut();
  }

  onAuthStateChange(callback: (session: AuthSession | null) => void): () => void {
    if (!this.supabase) return () => {};
    return this.supabase.onAuthStateChange(callback);
  }
}
