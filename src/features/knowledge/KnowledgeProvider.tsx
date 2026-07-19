import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { getSupabaseClient } from '@/core/supabase/client';
import {
  createKnowledgeRepositories,
  type KnowledgeRepositories,
} from './data/repositories';

const KnowledgeContext = createContext<KnowledgeRepositories | null>(null);

interface KnowledgeProviderProps {
  children: ReactNode;
  repositories?: KnowledgeRepositories;
}

export function KnowledgeProvider({
  children,
  repositories,
}: KnowledgeProviderProps) {
  const repos = useMemo<KnowledgeRepositories>(
    () => repositories ?? createKnowledgeRepositories(getSupabaseClient()),
    [repositories],
  );
  return (
    <KnowledgeContext.Provider value={repos}>
      {children}
    </KnowledgeContext.Provider>
  );
}

export function useKnowledgeRepositories(): KnowledgeRepositories {
  const repos = useContext(KnowledgeContext);
  if (!repos) {
    throw new Error(
      'useKnowledgeRepositories must be used within a KnowledgeProvider',
    );
  }
  return repos;
}
