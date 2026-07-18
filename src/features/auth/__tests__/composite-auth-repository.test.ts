import AsyncStorage from '@react-native-async-storage/async-storage';

import { CompositeAuthRepository } from '../data/composite-auth-repository';
import { isGuestUserId } from '../data/guest-session';
import { makeFakeSupabaseClient } from './test-utils';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('CompositeAuthRepository — guest mode', () => {
  it('starts a guest session and persists it across getSession', async () => {
    const repo = new CompositeAuthRepository(null);

    const start = await repo.signInAsGuest();
    expect(start.ok).toBe(true);
    if (!start.ok) return;
    expect(start.value.user.mode).toBe('guest');
    expect(isGuestUserId(start.value.user.id)).toBe(true);

    const restored = await repo.getSession();
    expect(restored.ok).toBe(true);
    if (!restored.ok) return;
    expect(restored.value?.user.mode).toBe('guest');
  });

  it('clears the guest session on sign out', async () => {
    const repo = new CompositeAuthRepository(null);
    await repo.signInAsGuest();
    await repo.signOut();

    const after = await repo.getSession();
    expect(after.ok).toBe(true);
    if (!after.ok) return;
    expect(after.value).toBeNull();
  });
});

describe('CompositeAuthRepository — no backend configured', () => {
  it('returns a typed not-configured error for password sign in', async () => {
    const repo = new CompositeAuthRepository(null);
    const result = await repo.signIn({ email: 'a@b.com', password: 'password1' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('auth/not-configured');
  });
});

describe('CompositeAuthRepository — Supabase backed', () => {
  it('signs in and maps the session, clearing any guest flag', async () => {
    const repo = new CompositeAuthRepository(makeFakeSupabaseClient());
    await repo.signInAsGuest(); // ensure guest is cleared by password sign-in

    const result = await repo.signIn({
      email: 'user@example.com',
      password: 'password1',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.user.mode).toBe('password');
    expect(result.value.user.email).toBe('user@example.com');
    expect(result.value.accessToken).toBe('token-123');
  });

  it('maps invalid credentials to a typed domain error', async () => {
    const repo = new CompositeAuthRepository(
      makeFakeSupabaseClient({ signInError: 'Invalid login credentials' }),
    );
    const result = await repo.signIn({ email: 'a@b.com', password: 'nope12345' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('auth/invalid-credentials');
  });
});
