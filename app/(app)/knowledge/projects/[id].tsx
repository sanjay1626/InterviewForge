import { useLocalSearchParams, useRouter } from 'expo-router';

import { EmptyView, LoadingView, Screen } from '@/core/ui';
import { ProjectEditor } from '@/features/knowledge/components/ProjectEditor';
import { useProjects } from '@/features/knowledge/hooks/useProjects';

export default function ProjectEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const projects = useProjects();

  const isNew = id === 'new';
  const existing = isNew ? undefined : projects.data?.find((p) => p.id === id);

  if (!isNew && projects.isLoading) {
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
          title="Project not found"
          message="It may have been deleted."
          actionLabel="Go back"
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  return <ProjectEditor existing={existing} onSaved={() => router.back()} />;
}
