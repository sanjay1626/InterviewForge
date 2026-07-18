import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react';

import { getSupabaseClient } from '@/core/supabase/client';
import { CompositeAuthRepository } from './data/composite-auth-repository';
import type { AuthRepository } from './data/auth-repository';
import { useAuthStore } from './store/auth-store';

const AuthRepositoryContext = createContext<AuthRepository | null>(null);

interface AuthProviderProps {
  children: ReactNode;
  /** Injectable for tests; defaults to the composite repo over the singleton. */
  repository?: AuthRepository;
}

/**
 * Bootstraps the auth session on cold start, subscribes to backend session
 * changes, and provides the repository to the feature's hooks. Routing reads
 * status from the Zustand store; this provider only writes to it.
 */
export function AuthProvider({ children, repository }: AuthProviderProps) {
  const repo = useMemo<AuthRepository>(
    () => repository ?? new CompositeAuthRepository(getSupabaseClient()),
    [repository],
  );

  const setSession = useAuthStore((s) => s.setSession);

  useEffect(() => {
    let active = true;

    void (async () => {
      const result = await repo.getSession();
      if (!active) return;
      setSession(result.ok ? result.value : null);
    })();

    const unsubscribe = repo.onAuthStateChange((session) => {
      // Ignore backend sign-outs while a local guest session is active; the
      // composite repo already resolves precedence in getSession().
      if (session) setSession(session);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [repo, setSession]);

  return (
    <AuthRepositoryContext.Provider value={repo}>
      {children}
    </AuthRepositoryContext.Provider>
  );
}

export function useAuthRepository(): AuthRepository {
  const repo = useContext(AuthRepositoryContext);
  if (!repo) {
    throw new Error('useAuthRepository must be used within an AuthProvider');
  }
  return repo;
}
