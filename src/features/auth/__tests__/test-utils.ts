import type { TypedSupabaseClient } from '@/core/supabase/client';

interface FakeAuthOptions {
  session?: unknown;
  signInError?: string;
  signUpError?: string;
}

/**
 * Minimal fake Supabase client for auth tests. Only implements the auth surface
 * the repository uses, cast to the typed client shape.
 */
export function makeFakeSupabaseClient(
  options: FakeAuthOptions = {},
): TypedSupabaseClient {
  const session =
    options.session ??
    ({
      access_token: 'token-123',
      user: { id: 'user-1', email: 'user@example.com' },
    } as const);

  const auth = {
    getSession: async () => ({ data: { session }, error: null }),
    signInWithPassword: async () =>
      options.signInError
        ? { data: { session: null }, error: { message: options.signInError } }
        : { data: { session }, error: null },
    signUp: async () =>
      options.signUpError
        ? { data: { session: null }, error: { message: options.signUpError } }
        : { data: { session }, error: null },
    signOut: async () => ({ error: null }),
    onAuthStateChange: () => ({
      data: { subscription: { unsubscribe: () => {} } },
    }),
  };

  return { auth } as unknown as TypedSupabaseClient;
}
