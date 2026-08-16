import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { getSupabaseClient } from '@/core/supabase/client';
import { CompositePrepRepository, type PrepRepository } from './data/prep-repository';

const PrepContext = createContext<PrepRepository | null>(null);

interface PrepProviderProps {
  children: ReactNode;
  repository?: PrepRepository;
}

export function PrepProvider({ children, repository }: PrepProviderProps) {
  const repo = useMemo<PrepRepository>(
    () => repository ?? new CompositePrepRepository(getSupabaseClient()),
    [repository],
  );
  return <PrepContext.Provider value={repo}>{children}</PrepContext.Provider>;
}

export function usePrepRepository(): PrepRepository {
  const repo = useContext(PrepContext);
  if (!repo) throw new Error('usePrepRepository must be used within a PrepProvider');
  return repo;
}
