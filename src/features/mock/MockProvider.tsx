import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { getSupabaseClient } from '@/core/supabase/client';
import { CompositeMockRepository } from './data/composite-mock-repository';
import type { MockInterviewRepository } from './data/mock-repository';

const MockContext = createContext<MockInterviewRepository | null>(null);

interface MockProviderProps {
  children: ReactNode;
  repository?: MockInterviewRepository;
}

export function MockProvider({ children, repository }: MockProviderProps) {
  const repo = useMemo<MockInterviewRepository>(
    () => repository ?? new CompositeMockRepository(getSupabaseClient()),
    [repository],
  );
  return <MockContext.Provider value={repo}>{children}</MockContext.Provider>;
}

export function useMockRepository(): MockInterviewRepository {
  const repo = useContext(MockContext);
  if (!repo) throw new Error('useMockRepository must be used within a MockProvider');
  return repo;
}
