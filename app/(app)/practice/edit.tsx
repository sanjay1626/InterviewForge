import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';

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
import {
  IDEAL_MAX_WORDS,
  IDEAL_MIN_WORDS,
  MAX_ANSWER_CHARS,
} from '@/features/practice/domain/evaluation';
import { useEvaluateAnswer } from '@/features/practice/hooks/usePractice';
import { usePracticeUiStore } from '@/features/practice/store/practice-ui-store';

/**
 * Edit a previous answer and re-evaluate it. Each save creates a NEW version
 * (a fresh attempt) so score progression is preserved — nothing is overwritten.
 * `source=improved` seeds the editor with the AI's improved answer (brackets
 * included) so the user can fill the gaps and make it their own.
 */
export default function EditAnswerScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { source } = useLocalSearchParams<{ source?: string }>();
  const last = usePracticeUiStore((s) => s.last);
  const setLast = usePracticeUiStore((s) => s.setLast);
  const evaluate = useEvaluateAnswer();

  const seed =
    source === 'improved' && last?.evaluation.improvedAnswer
      ? last.evaluation.improvedAnswer
      : (last?.answer ?? '');
  const [answer, setAnswer] = useState(seed);

  if (!last) {
    return (
      <Screen scroll={false} center>
        <EmptyView
          title="Nothing to edit"
          actionLabel="Go to practice"
          onAction={() => router.replace('/(app)/practice')}
        />
      </Screen>
    );
  }

  const wordCount = countWords(answer);
  const inRange = wordCount >= IDEAL_MIN_WORDS && wordCount <= IDEAL_MAX_WORDS;
  const canSubmit = wordCount >= 10 && !evaluate.isPending;

  const onSubmit = () => {
    if (!canSubmit) return;
    const edited = answer.trim();
    evaluate.mutate(
      {
        questionId: null,
        questionText: last.questionText,
        competency: last.competency,
        answer: edited,
        mode: last.mode,
      },
      {
        onSuccess: ({ evaluation, attempt }) => {
          setLast({
            attemptId: attempt?.id ?? null,
            questionText: last.questionText,
            competency: last.competency,
            answer: edited,
            mode: last.mode,
            evaluation,
          });
          router.replace('/(app)/practice/results');
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
            title={evaluate.isPending ? 'Re-evaluating…' : 'Save & re-evaluate'}
            onPress={onSubmit}
            loading={evaluate.isPending}
            disabled={!canSubmit}
          />
          <Caption>Saved as a new version — your earlier attempts are kept.</Caption>
        </View>
      }
    >
      <Card>
        <Caption style={{ color: theme.brand, fontWeight: '700' }}>QUESTION</Caption>
        <Subtitle>{last.questionText}</Subtitle>
      </Card>

      {source === 'improved' ? (
        <Body muted>
          This starts from the improved answer. Fill in anything in [brackets]
          with your real details, tweak the wording, then re-evaluate.
        </Body>
      ) : (
        <Body muted>Refine your answer, then re-evaluate to see if it scores higher.</Body>
      )}

      <TextField
        label="Your answer"
        value={answer}
        onChangeText={setAnswer}
        multiline
        numberOfLines={12}
        maxLength={MAX_ANSWER_CHARS}
        style={{ minHeight: 260, paddingTop: spacing.md }}
      />
      <Caption style={{ color: inRange ? theme.success : theme.textMuted }}>
        {wordCount} words · ~{spokenSecondsForWords(wordCount)}s spoken
        {wordCount > 0 && !inRange ? ` (aim for ${IDEAL_MIN_WORDS}–${IDEAL_MAX_WORDS})` : ''}
      </Caption>
    </Screen>
  );
}
