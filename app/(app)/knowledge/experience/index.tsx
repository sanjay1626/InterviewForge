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
import {
  useDeleteExperience,
  useExperiences,
} from '@/features/knowledge/hooks/useExperiences';

export default function ExperienceListScreen() {
  const theme = useTheme();
  const router = useRouter();
  const experiences = useExperiences();
  const remove = useDeleteExperience();

  const confirmDelete = (id: string, label: string) => {
    Alert.alert('Delete experience', `Remove "${label}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => remove.mutate(id) },
    ]);
  };

  return (
    <Screen
      footer={
        <Button
          title="Add experience"
          onPress={() => router.push('/(app)/knowledge/experience/new')}
        />
      }
    >
      <Body muted>
        Add each role you want to draw on. Real companies, titles, and results
        only.
      </Body>

      {experiences.isLoading ? (
        <LoadingView label="Loading experience…" />
      ) : experiences.isError ? (
        <ErrorView
          message={toUserMessage(experiences.error)}
          onRetry={() => experiences.refetch()}
        />
      ) : (experiences.data?.length ?? 0) === 0 ? (
        <EmptyView
          title="No experience added yet"
          message="Add your first role to start building grounded answers."
        />
      ) : (
        <View style={{ gap: spacing.sm }}>
          {experiences.data?.map((exp) => (
            <Card
              key={exp.id}
              accessibilityLabel={`${exp.title} at ${exp.company}`}
              onPress={() => router.push(`/(app)/knowledge/experience/${exp.id}`)}
            >
              <Subtitle>{exp.title}</Subtitle>
              <Caption>
                {exp.company}
                {exp.isCurrent ? ' · Current' : ''}
              </Caption>
              {exp.highlights.length > 0 ? (
                <Caption>{exp.highlights.length} accomplishment(s)</Caption>
              ) : null}
              <View style={{ alignSelf: 'flex-start', marginTop: spacing.xs }}>
                <Button
                  title="Delete"
                  variant="ghost"
                  fullWidth={false}
                  onPress={() => confirmDelete(exp.id, `${exp.title} at ${exp.company}`)}
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
