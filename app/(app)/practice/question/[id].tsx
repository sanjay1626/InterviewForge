import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';

import { env } from '@/core/config/env';
import { toUserMessage } from '@/core/domain/errors';
import { countWords, spokenSecondsForWords } from '@/core/utils/text';
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
import { useAuthStore } from '@/features/auth/store/auth-store';
import { findQuestion } from '@/features/practice/domain/questions';
import {
  IDEAL_MAX_WORDS,
  IDEAL_MIN_WORDS,
  MAX_ANSWER_CHARS,
} from '@/features/practice/domain/evaluation';
import { useEvaluateAnswer } from '@/features/practice/hooks/usePractice';
import { usePracticeUiStore } from '@/features/practice/store/practice-ui-store';

export default function PracticeQuestionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const question = id ? findQuestion(id) : undefined;

  const [answer, setAnswer] = useState('');
  const evaluate = useEvaluateAnswer();
  const setLast = usePracticeUiStore((s) => s.setLast);
  const isGuest = useAuthStore((s) => s.session?.user.mode === 'guest');

  if (!question) {
    return (
      <Screen scroll={false} center>
        <EmptyView title="Question not found" actionLabel="Go back" onAction={() => router.back()} />
      </Screen>
    );
  }

  const wordCount = countWords(answer);
  const seconds = spokenSecondsForWords(wordCount);
  const inRange = wordCount >= IDEAL_MIN_WORDS && wordCount <= IDEAL_MAX_WORDS;
  const canSubmit = wordCount >= 10 && !evaluate.isPending;

  const usesAi = !isGuest && env.isSupabaseConfigured;

  const onSubmit = () => {
    if (!canSubmit) return;
    evaluate.mutate(
      {
        questionId: question.id,
        questionText: question.prompt,
        competency: question.competency,
        answer: answer.trim(),
        mode: 'text',
      },
      {
        onSuccess: ({ evaluation, attempt }) => {
          setLast({
            attemptId: attempt?.id ?? null,
            questionText: question.prompt,
            competency: question.competency,
            answer: answer.trim(),
            mode: 'text',
            evaluation,
          });
          router.push('/(app)/practice/results');
        },
      },
    );
  };

  return (
    <Screen
      footer={
        <View style={{ gap: spacing.sm }}>
          {evaluate.isError ? (
            <Caption style={{ color: theme.danger }}>
              {toUserMessage(evaluate.error)}
            </Caption>
          ) : null}
          <Button
            title={evaluate.isPending ? 'Evaluating…' : 'Get feedback'}
            onPress={onSubmit}
            loading={evaluate.isPending}
            disabled={!canSubmit}
          />
          <Caption>
            {usesAi
              ? 'Evaluated by AI, grounded in your knowledge base.'
              : 'Offline estimate — connect an account + AI provider for grounded feedback.'}
          </Caption>
        </View>
      }
    >
      <Card>
        <Caption style={{ color: theme.brand, fontWeight: '700' }}>QUESTION</Caption>
        <Subtitle>{question.prompt}</Subtitle>
      </Card>

      <Button
        title="Answer by voice instead"
        variant="ghost"
        fullWidth={false}
        onPress={() => router.replace(`/(app)/practice/voice/${question.id}`)}
      />

      <Body muted>
        Answer in STAR form — Situation, Task, Action, Result. Use your real
        experience; you don’t need to invent numbers.
      </Body>

      <TextField
        label="Your answer"
        value={answer}
        onChangeText={setAnswer}
        multiline
        numberOfLines={10}
        maxLength={MAX_ANSWER_CHARS}
        placeholder="Start with the situation…"
        style={{ minHeight: 220, paddingTop: spacing.md }}
      />
      <Caption style={{ color: inRange ? theme.success : theme.textMuted }}>
        {wordCount} words · ~{seconds}s spoken
        {wordCount > 0 && !inRange ? ` (aim for ${IDEAL_MIN_WORDS}–${IDEAL_MAX_WORDS})` : ''}
      </Caption>
    </Screen>
  );
}
