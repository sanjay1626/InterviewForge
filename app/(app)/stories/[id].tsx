import { useLocalSearchParams, useRouter } from 'expo-router';

import { EmptyView, LoadingView, Screen } from '@/core/ui';
import { StarStoryBuilder } from '@/features/stories/components/StarStoryBuilder';
import { useStories } from '@/features/stories/hooks/useStories';

export default function StoryBuilderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const stories = useStories();

  const isNew = id === 'new';
  const existing = isNew ? undefined : stories.data?.find((s) => s.id === id);

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

  return <StarStoryBuilder existing={existing} onSaved={() => router.back()} />;
}
