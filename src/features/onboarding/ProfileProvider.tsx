import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { getSupabaseClient } from '@/core/supabase/client';
import { CompositeProfileRepository } from './data/composite-profile-repository';
import type { ProfileRepository } from './data/profile-repository';

const ProfileRepositoryContext = createContext<ProfileRepository | null>(null);

interface ProfileProviderProps {
  children: ReactNode;
  repository?: ProfileRepository;
}

export function ProfileProvider({ children, repository }: ProfileProviderProps) {
  const repo = useMemo<ProfileRepository>(
    () => repository ?? new CompositeProfileRepository(getSupabaseClient()),
    [repository],
  );
  return (
    <ProfileRepositoryContext.Provider value={repo}>
      {children}
    </ProfileRepositoryContext.Provider>
  );
}

export function useProfileRepository(): ProfileRepository {
  const repo = useContext(ProfileRepositoryContext);
  if (!repo) {
    throw new Error('useProfileRepository must be used within a ProfileProvider');
  }
  return repo;
}
