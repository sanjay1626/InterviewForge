import { useEffect, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { File } from 'expo-file-system';
import { View } from 'react-native';

import { toUserMessage } from '@/core/domain/errors';
import {
  Body,
  Button,
  Caption,
  Card,
  EmptyView,
  LoadingView,
  Screen,
  Subtitle,
  TextField,
  spacing,
  useTheme,
} from '@/core/ui';
import { analyzeFillers } from '@/features/practice/domain/fillers';
import { MAX_ANSWER_CHARS } from '@/features/practice/domain/evaluation';
import { findQuestion } from '@/features/practice/domain/questions';
import {
  useEvaluateAnswer,
  useTranscribe,
} from '@/features/practice/hooks/usePractice';
import { useRecorder } from '@/features/practice/hooks/useRecorder';
import { usePracticeUiStore } from '@/features/practice/store/practice-ui-store';

type Phase = 'record' | 'processing' | 'review';

function formatDuration(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function VoicePracticeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const question = id ? findQuestion(id) : undefined;

  const recorder = useRecorder();
  const transcribe = useTranscribe();
  const evaluate = useEvaluateAnswer();
  const setLast = usePracticeUiStore((s) => s.setLast);

  const [phase, setPhase] = useState<Phase>('record');
  const [transcript, setTranscript] = useState('');
  const [autoFailed, setAutoFailed] = useState(false);

  // Guard against setState after unmount (transcription resolves asynchronously).
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  if (!question) {
    return (
      <Screen scroll={false} center>
        <EmptyView title="Question not found" actionLabel="Go back" onAction={() => router.back()} />
      </Screen>
    );
  }

  const onStart = () => {
    void recorder.start();
  };

  const toReview = (failed: boolean, text?: string) => {
    if (!mounted.current) return;
    if (failed) setAutoFailed(true);
    if (text !== undefined) setTranscript(text);
    setPhase('review');
  };

  const onStop = async () => {
    const uri = await recorder.stop();
    if (!mounted.current) return;
    setPhase('processing');
    if (!uri) {
      toReview(true);
      return;
    }
    try {
      const audioBase64 = await new File(uri).base64();
      const ext = uri.split('.').pop()?.toLowerCase() ?? 'm4a';
      transcribe.mutate(
        { audioBase64, mimeType: `audio/${ext}`, fileName: `answer.${ext}` },
        {
          onSuccess: (text) => toReview(false, text),
          onError: () => toReview(true),
        },
      );
    } catch {
      toReview(true);
    }
  };

  const onSubmit = () => {
    const answer = transcript.trim();
    if (answer.length < 10) return;
    evaluate.mutate(
      {
        questionId: question.id,
        questionText: question.prompt,
        competency: question.competency,
        answer,
        mode: 'voice',
      },
      {
        onSuccess: ({ evaluation, attempt }) => {
          setLast({
            attemptId: attempt?.id ?? null,
            questionText: question.prompt,
            competency: question.competency,
            answer,
            mode: 'voice',
            evaluation,
          });
          router.push('/(app)/practice/results');
        },
      },
    );
  };

  const fillers = analyzeFillers(transcript);

  return (
    <Screen
      footer={
        phase === 'review' ? (
          <View style={{ gap: spacing.sm }}>
            {evaluate.isError ? (
              <Caption style={{ color: theme.danger }}>
                {toUserMessage(evaluate.error)}
              </Caption>
            ) : null}
            <Button
              title="Submit for feedback"
              onPress={onSubmit}
              loading={evaluate.isPending}
              disabled={transcript.trim().length < 10 || evaluate.isPending}
            />
          </View>
        ) : undefined
      }
    >
      <Card>
        <Caption style={{ color: theme.brand, fontWeight: '700' }}>QUESTION</Caption>
        <Subtitle>{question.prompt}</Subtitle>
      </Card>

      {phase === 'record' ? (
        <View style={{ gap: spacing.lg, alignItems: 'center', paddingVertical: spacing.xl }}>
          {recorder.isRecording ? (
            <>
              <Subtitle style={{ color: theme.danger }}>
                ● Recording {formatDuration(recorder.durationMillis)}
              </Subtitle>
              <Button title="Stop & transcribe" variant="danger" onPress={onStop} />
            </>
          ) : (
            <>
              <Body muted style={{ textAlign: 'center' }}>
                Tap record and answer out loud in STAR form. You’ll be able to
                correct the transcript before submitting.
              </Body>
              <Button title="Start recording" onPress={onStart} fullWidth={false} />
            </>
          )}
          {recorder.error ? (
            <Caption style={{ color: theme.danger }}>{recorder.error}</Caption>
          ) : null}
        </View>
      ) : null}

      {phase === 'processing' ? (
        <LoadingView label="Transcribing your answer…" />
      ) : null}

      {phase === 'review' ? (
        <View style={{ gap: spacing.sm }}>
          <Subtitle>Check your transcript</Subtitle>
          <Body muted>
            {autoFailed
              ? 'Automatic transcription wasn’t available — type or paste what you said.'
              : 'Fix any words the transcription got wrong, then submit.'}
          </Body>
          <TextField
            label="Transcript"
            value={transcript}
            onChangeText={setTranscript}
            multiline
            numberOfLines={10}
            maxLength={MAX_ANSWER_CHARS}
            placeholder="What you said…"
            style={{ minHeight: 200, paddingTop: spacing.md }}
          />
          {fillers.totalWords > 0 ? (
            <Caption
              style={{ color: fillers.rate > 4 ? theme.warning : theme.textMuted }}
            >
              {fillers.fillerCount} filler word{fillers.fillerCount === 1 ? '' : 's'} (
              {fillers.rate}/100 words)
              {fillers.breakdown.length
                ? ` · ${fillers.breakdown.slice(0, 3).map((b) => `${b.word} ×${b.count}`).join(', ')}`
                : ''}
            </Caption>
          ) : null}
        </View>
      ) : null}
    </Screen>
  );
}
