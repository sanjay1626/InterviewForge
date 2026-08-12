import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { getSupabaseClient } from '@/core/supabase/client';
import { CompositeEvaluationRepository } from './data/composite-evaluation-repository';
import { CompositePracticeRepository } from './data/composite-practice-repository';
import { CompositeTranscriptionRepository } from './data/transcription-repository';
import { CompositeFollowUpRepository } from './data/follow-up-repository';
import { CompositeTtsRepository } from './data/tts-repository';
import { CompositeAssistantRepository } from './data/assistant-repository';
import type { AssistantRepository } from './data/assistant-repository';
import type { EvaluationRepository } from './data/evaluation-repository';
import type { FollowUpRepository } from './data/follow-up-repository';
import type { PracticeRepository } from './data/practice-repository';
import type { TranscriptionRepository } from './data/transcription-repository';
import type { TtsRepository } from './data/tts-repository';

interface PracticeRepositories {
  evaluation: EvaluationRepository;
  practice: PracticeRepository;
  transcription: TranscriptionRepository;
  followUps: FollowUpRepository;
  tts: TtsRepository;
  assistant: AssistantRepository;
}

const PracticeContext = createContext<PracticeRepositories | null>(null);

interface PracticeProviderProps {
  children: ReactNode;
  repositories?: PracticeRepositories;
}

export function PracticeProvider({
  children,
  repositories,
}: PracticeProviderProps) {
  const repos = useMemo<PracticeRepositories>(() => {
    if (repositories) return repositories;
    const client = getSupabaseClient();
    return {
      evaluation: new CompositeEvaluationRepository(client),
      practice: new CompositePracticeRepository(client),
      transcription: new CompositeTranscriptionRepository(client),
      followUps: new CompositeFollowUpRepository(client),
      tts: new CompositeTtsRepository(client),
      assistant: new CompositeAssistantRepository(client),
    };
  }, [repositories]);

  return (
    <PracticeContext.Provider value={repos}>{children}</PracticeContext.Provider>
  );
}

export function usePracticeRepositories(): PracticeRepositories {
  const repos = useContext(PracticeContext);
  if (!repos) {
    throw new Error('usePracticeRepositories must be used within a PracticeProvider');
  }
  return repos;
}
