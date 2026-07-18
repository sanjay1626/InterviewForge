/**
 * Auth domain model — independent of Supabase and React Native. Repositories
 * translate provider sessions into these shapes so UI/state never depend on the
 * Supabase SDK directly.
 */

export type AuthMode = 'password' | 'guest';

export interface AuthUser {
  id: string;
  /** Null for guest sessions. */
  email: string | null;
  mode: AuthMode;
}

export interface AuthSession {
  user: AuthUser;
  /** Present for real (Supabase) sessions; absent for guest. */
  accessToken: string | null;
}

export interface Credentials {
  email: string;
  password: string;
}
