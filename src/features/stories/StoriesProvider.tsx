import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { getSupabaseClient } from '@/core/supabase/client';
import { createStoryRepository, type StoryRepository } from './data/repositories';

const StoriesContext = createContext<StoryRepository | null>(null);

interface StoriesProviderProps {
  children: ReactNode;
  repository?: StoryRepository;
}

export function StoriesProvider({ children, repository }: StoriesProviderProps) {
  const repo = useMemo<StoryRepository>(
    () => repository ?? createStoryRepository(getSupabaseClient()),
    [repository],
  );
  return (
    <StoriesContext.Provider value={repo}>{children}</StoriesContext.Provider>
  );
}

export function useStoryRepository(): StoryRepository {
  const repo = useContext(StoriesContext);
  if (!repo) {
    throw new Error('useStoryRepository must be used within a StoriesProvider');
  }
  return repo;
}
