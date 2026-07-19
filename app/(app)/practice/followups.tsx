import { useState } from 'react';
import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { toUserMessage } from '@/core/domain/errors';
import {
  Body,
  Button,
  Caption,
  Card,
  EmptyView,
  Screen,
  Subtitle,
  TextField,
  spacing,
  useTheme,
} from '@/core/ui';
import { MAX_FOLLOWUP_CHARS } from '@/features/practice/domain/evaluation';
import { GENERIC_FOLLOW_UPS } from '@/features/practice/domain/questions';
import { useEvaluateFollowUp } from '@/features/practice/hooks/usePractice';
import { usePracticeUiStore } from '@/features/practice/store/practice-ui-store';

interface FollowUpResult {
  score: number;
  feedback: string;
}

export default function FollowUpsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const last = usePracticeUiStore((s) => s.last);
  const evaluate = useEvaluateFollowUp();

  const [responses, setResponses] = useState<Record<number, string>>({});
  const [results, setResults] = useState<Record<number, FollowUpResult>>({});
  const [pending, setPending] = useState<number | null>(null);

  if (!last) {
    return (
      <Screen scroll={false} center>
        <EmptyView
          title="No answer to follow up on"
          message="Practice a question first."
          actionLabel="Go to practice"
          onAction={() => router.replace('/(app)/practice')}
        />
      </Screen>
    );
  }

  const prompts =
    last.evaluation.suggestedFollowUps.length > 0
      ? last.evaluation.suggestedFollowUps
      : GENERIC_FOLLOW_UPS;

  const submit = (index: number) => {
    const response = (responses[index] ?? '').trim();
    if (response.length < 5) return;
    setPending(index);
    evaluate.mutate(
      {
        answerId: last.attemptId,
        prompt: prompts[index]!,
        response,
        competency: last.competency,
      },
      {
        onSuccess: (evaluation) => {
          setResults((r) => ({
            ...r,
            [index]: {
              score: evaluation.overallScore,
              feedback:
                [...evaluation.recommendations, ...evaluation.missingDetails]
                  .slice(0, 2)
                  .join(' ') || 'Looks good — clear and specific.',
            },
          }));
          setPending(null);
        },
        onError: () => setPending(null),
      },
    );
  };

  return (
    <Screen>
      <Subtitle>Follow-up questions</Subtitle>
      <Body muted>
        Interviewers probe deeper. Answer each in a sentence or two — feedback
        stays grounded in your real experience.
      </Body>

      {prompts.map((prompt, i) => {
        const result = results[i];
        return (
          <Card key={`${i}-${prompt}`}>
            <Body style={{ fontWeight: '600' }}>{prompt}</Body>
            <TextField
              label="Your response"
              value={responses[i] ?? ''}
              onChangeText={(v) => setResponses((r) => ({ ...r, [i]: v }))}
              multiline
              numberOfLines={3}
              maxLength={MAX_FOLLOWUP_CHARS}
              style={{ minHeight: 72, paddingTop: spacing.sm }}
            />
            <Button
              title={result ? 'Re-check' : 'Get feedback'}
              variant="secondary"
              loading={pending === i}
              disabled={pending !== null || (responses[i] ?? '').trim().length < 5}
              onPress={() => submit(i)}
            />
            {result ? (
              <View style={{ gap: spacing.xs, marginTop: spacing.xs }}>
                <Caption style={{ color: theme.brand, fontWeight: '700' }}>
                  {result.score}/100
                </Caption>
                <Caption>{result.feedback}</Caption>
              </View>
            ) : null}
          </Card>
        );
      })}

      {evaluate.isError && pending === null ? (
        <Caption style={{ color: theme.danger }}>
          {toUserMessage(evaluate.error)}
        </Caption>
      ) : null}

      <Button
        title="Done"
        variant="secondary"
        onPress={() => router.replace('/(app)/practice')}
      />
    </Screen>
  );
}
