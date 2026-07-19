import { useLocalSearchParams, useRouter } from 'expo-router';

import { EmptyView, LoadingView, Screen } from '@/core/ui';
import { ExperienceEditor } from '@/features/knowledge/components/ExperienceEditor';
import { useExperiences } from '@/features/knowledge/hooks/useExperiences';

export default function ExperienceEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const experiences = useExperiences();

  const isNew = id === 'new';
  const existing = isNew ? undefined : experiences.data?.find((e) => e.id === id);

  if (!isNew && experiences.isLoading) {
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
          title="Experience not found"
          message="It may have been deleted."
          actionLabel="Go back"
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  return <ExperienceEditor existing={existing} onSaved={() => router.back()} />;
}
