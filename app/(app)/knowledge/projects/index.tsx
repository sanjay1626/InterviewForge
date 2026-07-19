import { useRouter } from 'expo-router';
import { Alert, View } from 'react-native';

import { toUserMessage } from '@/core/domain/errors';
import {
  Body,
  Button,
  Caption,
  Card,
  EmptyView,
  ErrorView,
  LoadingView,
  Screen,
  Subtitle,
  spacing,
  useTheme,
} from '@/core/ui';
import { useDeleteProject, useProjects } from '@/features/knowledge/hooks/useProjects';

export default function ProjectListScreen() {
  const theme = useTheme();
  const router = useRouter();
  const projects = useProjects();
  const remove = useDeleteProject();

  const confirmDelete = (id: string, label: string) => {
    Alert.alert('Delete project', `Remove "${label}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => remove.mutate(id) },
    ]);
  };

  return (
    <Screen
      footer={
        <Button
          title="Add project"
          onPress={() => router.push('/(app)/knowledge/projects/new')}
        />
      }
    >
      <Body muted>Capture real projects and the part you actually played.</Body>

      {projects.isLoading ? (
        <LoadingView label="Loading projects…" />
      ) : projects.isError ? (
        <ErrorView
          message={toUserMessage(projects.error)}
          onRetry={() => projects.refetch()}
        />
      ) : (projects.data?.length ?? 0) === 0 ? (
        <EmptyView
          title="No projects yet"
          message="Add a project to enrich your practice answers."
        />
      ) : (
        <View style={{ gap: spacing.sm }}>
          {projects.data?.map((project) => (
            <Card
              key={project.id}
              accessibilityLabel={project.name}
              onPress={() => router.push(`/(app)/knowledge/projects/${project.id}`)}
            >
              <Subtitle>{project.name}</Subtitle>
              {project.role ? <Caption>{project.role}</Caption> : null}
              {project.skills.length > 0 ? (
                <Caption>{project.skills.slice(0, 4).join(' · ')}</Caption>
              ) : null}
              <View style={{ alignSelf: 'flex-start', marginTop: spacing.xs }}>
                <Button
                  title="Delete"
                  variant="ghost"
                  fullWidth={false}
                  onPress={() => confirmDelete(project.id, project.name)}
                />
              </View>
            </Card>
          ))}
        </View>
      )}
      {remove.isError ? (
        <Caption style={{ color: theme.danger }}>
          {toUserMessage(remove.error)}
        </Caption>
      ) : null}
    </Screen>
  );
}
