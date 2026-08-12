import { useRouter } from 'expo-router';
import { View } from 'react-native';

import {
  Body,
  Button,
  Caption,
  Card,
  EmptyView,
  Screen,
  ScoreBar,
  Subtitle,
  Title,
  spacing,
  useTheme,
} from '@/core/ui';
import {
  IDEAL_MAX_WORDS,
  RUBRIC_KEYS,
  RUBRIC_LABELS,
} from '@/features/practice/domain/evaluation';
import { countWords, spokenSecondsForWords } from '@/core/utils/text';
import { analyzeFillers } from '@/features/practice/domain/fillers';
import { usePracticeUiStore } from '@/features/practice/store/practice-ui-store';

function Bullets({ items, color }: { items: string[]; color?: string }) {
  return (
    <View style={{ gap: spacing.xs }}>
      {items.map((item, i) => (
        <Caption key={i} muted={!color} style={color ? { color } : undefined}>
          • {item}
        </Caption>
      ))}
    </View>
  );
}

export default function EvaluationResultsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const last = usePracticeUiStore((s) => s.last);

  if (!last) {
    return (
      <Screen scroll={false} center>
        <EmptyView
          title="No evaluation yet"
          message="Practice a question to see feedback."
          actionLabel="Go to practice"
          onAction={() => router.replace('/(app)/practice')}
        />
      </Screen>
    );
  }

  const { evaluation } = last;
  const scoreColor =
    evaluation.overallScore >= 70
      ? theme.success
      : evaluation.overallScore >= 40
        ? theme.warning
        : theme.danger;

  const wordCount = countWords(last.answer);
  const tooLong = wordCount > IDEAL_MAX_WORDS;
  const fillers = last.mode === 'voice' ? analyzeFillers(last.answer) : null;
  const hasWatchouts = tooLong || (fillers ? fillers.fillerCount > 0 : false);

  return (
    <Screen
      footer={
        <View style={{ gap: spacing.sm }}>
          <Button
            title="See improved answer"
            onPress={() => router.push('/(app)/practice/improved')}
          />
          <Button
            title="Refine my answer & re-evaluate"
            variant="secondary"
            onPress={() => router.push('/(app)/practice/edit')}
          />
          <Button
            title="Practice follow-up questions"
            variant="ghost"
            onPress={() => router.push('/(app)/practice/followups')}
          />
          <Caption style={{ color: last.attemptId ? theme.success : theme.textMuted }}>
            {last.attemptId
              ? '✓ Saved to your history — find it under Practice → My answers.'
              : 'Not saved (offline). Sign in to keep your practice history.'}
          </Caption>
        </View>
      }
    >
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Caption>OVERALL</Caption>
            <Title style={{ color: scoreColor }}>{evaluation.overallScore}/100</Title>
          </View>
          <Caption
            style={{
              color: evaluation.source === 'ai' ? theme.brand : theme.warning,
              fontWeight: '700',
            }}
          >
            {evaluation.source === 'ai' ? 'AI · GROUNDED' : 'OFFLINE ESTIMATE'}
          </Caption>
        </View>
      </Card>

      <View style={{ gap: spacing.sm }}>
        <Subtitle>Rubric</Subtitle>
        <Card>
          <View style={{ gap: spacing.sm }}>
            {RUBRIC_KEYS.map((k) => (
              <ScoreBar key={k} label={RUBRIC_LABELS[k]} value={evaluation.scores[k]} />
            ))}
          </View>
        </Card>
      </View>

      {hasWatchouts ? (
        <View style={{ gap: spacing.xs }}>
          <Subtitle>Delivery insights</Subtitle>
          {tooLong ? (
            <Caption style={{ color: theme.warning }}>
              • Answer ran long ({wordCount} words · ~{spokenSecondsForWords(wordCount)}s).
              Aim for 60–120 seconds.
            </Caption>
          ) : null}
          {fillers && fillers.fillerCount > 0 ? (
            <Caption style={{ color: fillers.rate > 4 ? theme.warning : theme.textMuted }}>
              • {fillers.fillerCount} filler word{fillers.fillerCount === 1 ? '' : 's'} (
              {fillers.rate}/100){fillers.breakdown.length ? `: ${fillers.breakdown.slice(0, 3).map((b) => `${b.word} ×${b.count}`).join(', ')}` : ''}
            </Caption>
          ) : null}
        </View>
      ) : null}

      {evaluation.strengths.length > 0 ? (
        <View style={{ gap: spacing.xs }}>
          <Subtitle>Strengths</Subtitle>
          <Bullets items={evaluation.strengths} color={theme.success} />
        </View>
      ) : null}

      {evaluation.missingDetails.length > 0 ? (
        <View style={{ gap: spacing.xs }}>
          <Subtitle>Missing details</Subtitle>
          <Bullets items={evaluation.missingDetails} />
        </View>
      ) : null}

      {evaluation.unsupportedClaims.length > 0 ? (
        <View style={{ gap: spacing.xs }}>
          <Subtitle style={{ color: theme.danger }}>Double-check these claims</Subtitle>
          <Body muted>Statements not backed by your saved experience:</Body>
          <Bullets items={evaluation.unsupportedClaims} color={theme.danger} />
        </View>
      ) : null}

      {evaluation.recommendations.length > 0 ? (
        <View style={{ gap: spacing.xs }}>
          <Subtitle>Recommended improvements</Subtitle>
          <Bullets items={evaluation.recommendations} />
        </View>
      ) : null}

      {evaluation.suggestedFollowUps.length > 0 ? (
        <View style={{ gap: spacing.xs }}>
          <Subtitle>Likely follow-ups</Subtitle>
          <Bullets items={evaluation.suggestedFollowUps} />
        </View>
      ) : null}

      <Button
        title="Practice another question"
        variant="secondary"
        onPress={() => router.replace('/(app)/practice')}
      />
    </Screen>
  );
}
