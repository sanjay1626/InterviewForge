import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';

import {
  competencyLabel,
  isCompetency,
} from '@/core/domain/competencies';
import {
  Body,
  Card,
  EmptyView,
  Screen,
  spacing,
} from '@/core/ui';
import { questionsByCompetency } from '@/features/practice/domain/questions';

export default function CompetencyQuestionsScreen() {
  const { competency } = useLocalSearchParams<{ competency: string }>();
  const router = useRouter();

  if (!competency || !isCompetency(competency)) {
    return (
      <Screen scroll={false} center>
        <EmptyView title="Unknown category" />
      </Screen>
    );
  }

  const questions = questionsByCompetency(competency);

  return (
    <Screen>
      <Stack.Screen options={{ title: competencyLabel(competency) }} />
      <Body muted>Tap a question to practice your answer.</Body>
      <View style={{ gap: spacing.sm }}>
        {questions.map((q) => (
          <Card
            key={q.id}
            accessibilityLabel={q.prompt}
            onPress={() => router.push(`/(app)/practice/question/${q.id}`)}
          >
            <Body style={{ fontWeight: '600' }}>{q.prompt}</Body>
          </Card>
        ))}
      </View>
    </Screen>
  );
}
