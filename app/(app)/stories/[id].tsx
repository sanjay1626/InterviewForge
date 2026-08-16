import { useLocalSearchParams, useRouter } from 'expo-router';

import { isCompetency } from '@/core/domain/competencies';
import { EmptyView, LoadingView, Screen } from '@/core/ui';
import { StarStoryBuilder } from '@/features/stories/components/StarStoryBuilder';
import type { StarStoryInput } from '@/features/stories/domain/types';
import { useStories } from '@/features/stories/hooks/useStories';

export default function StoryBuilderScreen() {
  const params = useLocalSearchParams<{
    id: string;
    title?: string;
    competency?: string;
    company?: string;
    situation?: string;
  }>();
  const { id } = params;
  const router = useRouter();
  const stories = useStories();

  const isNew = id === 'new';
  const existing = isNew ? undefined : stories.data?.find((s) => s.id === id);

  // Prefill a new story from navigation params (e.g. Fast Prep suggestions).
  const initial: Partial<StarStoryInput> | undefined = isNew
    ? {
        ...(params.title ? { title: params.title } : {}),
        ...(params.company ? { company: params.company } : {}),
        ...(params.situation ? { situation: params.situation } : {}),
        ...(params.competency && isCompetency(params.competency)
          ? { competencies: [params.competency] }
          : {}),
      }
    : undefined;

  if (!isNew && stories.isLoading) {
    return (
      <Screen scroll={false} center>
        <LoadingView label="Loading…" />
      </Screen>
    );
  }

  if (!isNew && !existing) {
    return (
      <Screen scroll={false} center>
        <EmptyView
          title="Story not found"
          message="It may have been deleted."
          actionLabel="Go back"
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  return (
    <StarStoryBuilder existing={existing} initial={initial} onSaved={() => router.back()} />
  );
}
