import { useMemo } from 'react';
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
import type { PracticeAttempt } from '@/features/practice/domain/attempt';
import { groupAttemptsByQuestion } from '@/features/practice/domain/history';
import {
  useDeleteAttempt,
  useRecentAttempts,
} from '@/features/practice/hooks/usePractice';
import { usePracticeUiStore } from '@/features/practice/store/practice-ui-store';

function scoreColor(score: number, theme: ReturnType<typeof useTheme>) {
  return score >= 70 ? theme.success : score >= 40 ? theme.warning : theme.danger;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString();
}

export default function HistoryScreen() {
  const theme = useTheme();
  const router = useRouter();
  const attempts = useRecentAttempts(200);
  const remove = useDeleteAttempt();
  const setLast = usePracticeUiStore((s) => s.setLast);

  const groups = useMemo(
    () => groupAttemptsByQuestion(attempts.data ?? []),
    [attempts.data],
  );

  const view = (attempt: PracticeAttempt) => {
    setLast({
      attemptId: attempt.id,
      questionText: attempt.questionText,
      competency: attempt.competency,
      answer: attempt.answer,
      mode: attempt.mode,
      evaluation: attempt.evaluation,
    });
    router.push('/(app)/practice/results');
  };

  const confirmDelete = (attempt: PracticeAttempt) => {
    Alert.alert('Delete this version', 'Remove this saved answer and its feedback?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => remove.mutate(attempt.id) },
    ]);
  };

  if (attempts.isLoading) {
    return (
      <Screen scroll={false} center>
        <LoadingView label="Loading your answers…" />
      </Screen>
    );
  }
  if (attempts.isError) {
    return (
      <Screen scroll={false} center>
        <ErrorView message={toUserMessage(attempts.error)} onRetry={() => attempts.refetch()} />
      </Screen>
    );
  }
  if (groups.length === 0) {
    return (
      <Screen scroll={false} center>
        <EmptyView
          title="No saved answers yet"
          message="Every answer you practice is saved here so you can refine it and track your progress."
          actionLabel="Start practicing"
          onAction={() => router.replace('/(app)/practice')}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <Body muted>
        Every answer you practice is saved. Reopen one to refine it and
        re-evaluate — your score progression is tracked per question.
      </Body>

      {groups.map((group) => (
        <View key={group.questionText} style={{ gap: spacing.sm }}>
          <View style={{ gap: 2 }}>
            <Subtitle>{group.questionText}</Subtitle>
            <Caption>
              {group.attempts.length} version{group.attempts.length === 1 ? '' : 's'}
              {group.attempts.length > 1
                ? ` · ${group.firstScore} → ${group.latestScore}${
                    group.trend > 0 ? ` (▲ ${group.trend})` : group.trend < 0 ? ` (▼ ${-group.trend})` : ''
                  }`
                : ` · ${group.latestScore}/100`}
            </Caption>
          </View>

          {group.attempts.map((attempt, i) => (
            <Card key={attempt.id} accessibilityLabel={`Version ${group.attempts.length - i}`}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <Subtitle style={{ color: scoreColor(attempt.evaluation.overallScore, theme) }}>
                  {attempt.evaluation.overallScore}
                </Subtitle>
                <View style={{ flex: 1 }}>
                  <Caption muted={false} style={{ color: theme.text }}>
                    {i === 0 ? 'Latest' : `Version ${group.attempts.length - i}`} · {attempt.mode}
                  </Caption>
                  <Caption>
                    {formatDate(attempt.createdAt)}
                    {attempt.evaluation.source === 'offline' ? ' · offline' : ''}
                  </Caption>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs }}>
                <View style={{ flex: 1 }}>
                  <Button title="View & refine" variant="secondary" onPress={() => view(attempt)} />
                </View>
                <Button
                  title="Delete"
                  variant="ghost"
                  fullWidth={false}
                  onPress={() => confirmDelete(attempt)}
                />
              </View>
            </Card>
          ))}
        </View>
      ))}

      {remove.isError ? (
        <Caption style={{ color: theme.danger }}>{toUserMessage(remove.error)}</Caption>
      ) : null}
    </Screen>
  );
}
