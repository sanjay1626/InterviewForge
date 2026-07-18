import type { Result } from '@/core/domain/result';
import type { AuthSession, Credentials } from '../domain/types';

/**
 * Repository interface for authentication. UI and hooks depend only on this
 * contract; concrete implementations (Supabase, guest) are swapped behind it.
 */
export interface AuthRepository {
  /** Returns the persisted session on cold start, or null if signed out. */
  getSession(): Promise<Result<AuthSession | null>>;
  signUp(credentials: Credentials): Promise<Result<AuthSession>>;
  signIn(credentials: Credentials): Promise<Result<AuthSession>>;
  /** Begins a local, backend-free guest session for demos. */
  signInAsGuest(): Promise<Result<AuthSession>>;
  signOut(): Promise<Result<void>>;
  /**
   * Subscribes to session changes (token refresh, sign-out from another tab).
   * Returns an unsubscribe function. Guest repo may return a no-op.
   */
  onAuthStateChange(callback: (session: AuthSession | null) => void): () => void;
}
