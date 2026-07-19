import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';

import { toUserMessage } from '@/core/domain/errors';
import {
  Body,
  Caption,
  Card,
  EmptyView,
  ErrorView,
  LoadingView,
  Screen,
  ScoreBar,
  Subtitle,
  Title,
  spacing,
  useTheme,
} from '@/core/ui';
import { useStories } from '@/features/stories/hooks/useStories';
import { computeProgress } from '@/features/practice/domain/progress';
import { useRecentAttempts } from '@/features/practice/hooks/usePractice';

function Stat({ label, value }: { label: string; value: string | number }) {
  const theme = useTheme();
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Title style={{ color: theme.brand }}>{value}</Title>
      <Caption>{label}</Caption>
    </View>
  );
}

export default function ProgressScreen() {
  const theme = useTheme();
  const router = useRouter();
  const attempts = useRecentAttempts(100);
  const stories = useStories();

  const summary = useMemo(
    () => computeProgress(attempts.data ?? [], stories.data ?? []),
    [attempts.data, stories.data],
  );

  if (attempts.isLoading) {
    return (
      <Screen scroll={false} center>
        <LoadingView label="Loading your progress…" />
      </Screen>
    );
  }
  if (attempts.isError) {
    return (
      <Screen scroll={false} center>
        <ErrorView
          message={toUserMessage(attempts.error)}
          onRetry={() => attempts.refetch()}
        />
      </Screen>
    );
  }

  if (summary.questionsPracticed === 0) {
    return (
      <Screen scroll={false} center>
        <EmptyView
          title="No practice yet"
          message="Answer a question to start tracking your progress."
          actionLabel="Start practicing"
          onAction={() => router.replace('/(app)/practice')}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <Title>Your progress</Title>

      <Card>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <Stat label="Questions practiced" value={summary.questionsPracticed} />
          <Stat label="Avg score" value={`${summary.averageScore}`} />
          <Stat label="Day streak" value={summary.streakDays} />
        </View>
      </Card>

      <Card>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <Stat label="Stories ready" value={summary.storiesReady} />
          <Stat label="Stories to finish" value={summary.storiesNeedingDetail} />
        </View>
      </Card>

      {summary.strongest && summary.weakest ? (
        <View style={{ gap: spacing.xs }}>
          <Subtitle>Competencies</Subtitle>
          <Caption style={{ color: theme.success }}>
            Strongest: {summary.strongest.label} ({summary.strongest.average})
          </Caption>
          <Caption style={{ color: theme.warning }}>
            Focus area: {summary.weakest.label} ({summary.weakest.average})
          </Caption>
          <Card>
            <View style={{ gap: spacing.sm }}>
              {summary.competencyScores.map((c) => (
                <ScoreBar key={c.competency} label={c.label} value={c.average} max={100} />
              ))}
            </View>
          </Card>
        </View>
      ) : null}

      {(summary.answersTooLong > 0 || summary.fillerHeavyCount > 0) ? (
        <View style={{ gap: spacing.xs }}>
          <Subtitle>Delivery watch-outs</Subtitle>
          {summary.answersTooLong > 0 ? (
            <Caption>• {summary.answersTooLong} answer(s) ran long (aim for 60–120s).</Caption>
          ) : null}
          {summary.fillerHeavyCount > 0 ? (
            <Caption>• {summary.fillerHeavyCount} voice answer(s) had frequent filler words.</Caption>
          ) : null}
        </View>
      ) : null}

      {summary.recommendedNext.length > 0 ? (
        <View style={{ gap: spacing.sm }}>
          <Subtitle>Practice next</Subtitle>
          <Caption>
            {summary.weakest
              ? `Targeted at your focus area: ${summary.weakest.label}.`
              : 'Foundational questions to start with.'}
          </Caption>
          {summary.recommendedNext.map((q) => (
            <Card
              key={q.id}
              accessibilityLabel={q.prompt}
              onPress={() => router.push(`/(app)/practice/question/${q.id}`)}
            >
              <Body style={{ fontWeight: '600' }}>{q.prompt}</Body>
            </Card>
          ))}
        </View>
      ) : null}

      {summary.recentAttempts.length > 0 ? (
        <View style={{ gap: spacing.sm }}>
          <Subtitle>Recent sessions</Subtitle>
          {summary.recentAttempts.map((a) => (
            <Card key={a.id}>
              <Body style={{ fontWeight: '600' }} numberOfLines={2}>
                {a.questionText}
              </Body>
              <Caption>
                {a.evaluation.overallScore}/100 · {a.mode}
                {a.evaluation.source === 'offline' ? ' · offline' : ''}
              </Caption>
            </Card>
          ))}
        </View>
      ) : null}
    </Screen>
  );
}
