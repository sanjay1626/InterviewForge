import { useRouter } from 'expo-router';
import { View } from 'react-native';

import {
  Body,
  Button,
  Caption,
  Card,
  EmptyView,
  Screen,
  Subtitle,
  spacing,
  useTheme,
} from '@/core/ui';
import { useSpeech } from '@/features/practice/hooks/useSpeech';
import { usePracticeUiStore } from '@/features/practice/store/practice-ui-store';

export default function ImprovedAnswerScreen() {
  const theme = useTheme();
  const router = useRouter();
  const last = usePracticeUiStore((s) => s.last);
  const speech = useSpeech();

  if (!last) {
    return (
      <Screen scroll={false} center>
        <EmptyView
          title="Nothing to compare"
          actionLabel="Go to practice"
          onAction={() => router.replace('/(app)/practice')}
        />
      </Screen>
    );
  }

  const { answer, evaluation } = last;

  return (
    <Screen>
      <Body muted>
        Your facts are preserved. Anything the improved answer couldn’t verify is
        marked in [brackets] for you to confirm — never guessed.
      </Body>

      <View style={{ gap: spacing.sm }}>
        <Subtitle>Your original</Subtitle>
        <Card>
          <Body>{answer}</Body>
        </Card>
      </View>

      <View style={{ gap: spacing.sm }}>
        <Subtitle style={{ color: theme.brand }}>Improved (STAR)</Subtitle>
        <Card selected>
          <Body>{evaluation.improvedAnswer || '—'}</Body>
        </Card>
        {evaluation.improvedAnswer ? (
          <Button
            title={
              speech.loading
                ? 'Preparing audio…'
                : speech.speaking
                  ? 'Stop playback'
                  : '▶  Play improved answer'
            }
            variant="secondary"
            loading={speech.loading}
            onPress={() => speech.toggle(evaluation.improvedAnswer)}
          />
        ) : null}
      </View>

      {evaluation.changeExplanation ? (
        <View style={{ gap: spacing.xs }}>
          <Subtitle>What changed</Subtitle>
          <Caption>{evaluation.changeExplanation}</Caption>
        </View>
      ) : null}

      {evaluation.factsUsed.length > 0 ? (
        <View style={{ gap: spacing.xs }}>
          <Subtitle>Facts used</Subtitle>
          {evaluation.factsUsed.map((f, i) => (
            <Caption key={i}>• {f}</Caption>
          ))}
        </View>
      ) : null}

      {evaluation.missingInfo.length > 0 ? (
        <View style={{ gap: spacing.xs }}>
          <Subtitle style={{ color: theme.warning }}>
            Confirm or fill in
          </Subtitle>
          <Body muted>These were left as prompts rather than guessed:</Body>
          {evaluation.missingInfo.map((m, i) => (
            <Caption key={i} style={{ color: theme.warning }}>
              • {m}
            </Caption>
          ))}
        </View>
      ) : null}

      {evaluation.improvedAnswer ? (
        <Button
          title="Make it mine — edit & re-evaluate"
          onPress={() => router.push('/(app)/practice/edit?source=improved')}
        />
      ) : null}
      <Button
        title="Back to practice"
        variant="secondary"
        onPress={() => router.replace('/(app)/practice')}
      />
    </Screen>
  );
}
