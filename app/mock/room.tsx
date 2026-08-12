import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { File } from 'expo-file-system';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { toUserMessage } from '@/core/domain/errors';
import {
  Body,
  Button,
  Caption,
  Subtitle,
  TextField,
  Title,
  spacing,
  useTheme,
} from '@/core/ui';
import { MAX_ANSWER_CHARS } from '@/features/practice/domain/evaluation';
import { useRecorder } from '@/features/practice/hooks/useRecorder';
import { useSpeech } from '@/features/practice/hooks/useSpeech';
import { useTranscribe } from '@/features/practice/hooks/usePractice';
import { DIFFICULTY_META } from '@/features/mock/domain/config';
import { decideFollowUp } from '@/features/mock/domain/followup';
import type { MockAnswer, MockFollowUp, MockSession } from '@/features/mock/domain/session';
import { useBuildMockReport, useSaveMockSession } from '@/features/mock/hooks/useMock';
import { useMockStore } from '@/features/mock/store/mock-store';

type Phase = 'answer' | 'transcribing' | 'review' | 'processing';

function formatMs(ms: number): string {
  const total = Math.floor(ms / 1000);
  return `${Math.floor(total / 60)}:${(total % 60).toString().padStart(2, '0')}`;
}

export default function MockRoomScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const session = useMockStore((s) => s.session);
  const setSession = useMockStore((s) => s.setSession);
  const speech = useSpeech();
  const recorder = useRecorder();
  const transcribe = useTranscribe();
  const buildReport = useBuildMockReport();
  const saveSession = useSaveMockSession();

  const [qIndex, setQIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('answer');
  const [unitMode, setUnitMode] = useState<'main' | 'followup'>('main');
  const [unitPrompt, setUnitPrompt] = useState('');
  const [transcript, setTranscript] = useState('');
  const [mainTranscript, setMainTranscript] = useState('');
  const [followUps, setFollowUps] = useState<MockFollowUp[]>([]);
  const [followUpsAsked, setFollowUpsAsked] = useState(0);
  const [answers, setAnswers] = useState<MockAnswer[]>([]);
  const [answerStartMs, setAnswerStartMs] = useState(0);
  const [autoFailed, setAutoFailed] = useState(false);

  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const plan = session?.plan ?? [];
  const total = plan.length;
  const current = plan[qIndex];
  const isVoice = session?.config.responseMode === 'voice';

  // Speak the current unit prompt (best effort) when it changes.
  const spokenFor = useRef('');
  useEffect(() => {
    if (!unitPrompt || phase !== 'answer') return;
    if (spokenFor.current === `${qIndex}:${unitMode}:${unitPrompt}`) return;
    spokenFor.current = `${qIndex}:${unitMode}:${unitPrompt}`;
    void speech.speak(unitPrompt);
    setAnswerStartMs(Date.now());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitPrompt, phase, qIndex, unitMode]);

  // Seed the first question.
  useEffect(() => {
    if (current && !unitPrompt) setUnitPrompt(current.prompt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  const elapsedMs = isVoice && recorder.isRecording ? recorder.durationMillis : 0;

  if (!session || !current) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center', padding: spacing.xl }}>
        <Body muted style={{ textAlign: 'center' }}>No interview in progress.</Body>
        <View style={{ marginTop: spacing.lg }}>
          <Button title="Set up an interview" fullWidth={false} onPress={() => router.replace('/mock/setup')} />
        </View>
      </View>
    );
  }

  const finishAnswerVoice = async () => {
    speech.stop();
    const uri = await recorder.stop();
    setPhase('transcribing');
    if (!uri) {
      setAutoFailed(true);
      setTranscript('');
      setPhase('review');
      return;
    }
    try {
      const audioBase64 = await new File(uri).base64();
      const ext = uri.split('.').pop()?.toLowerCase() ?? 'm4a';
      transcribe.mutate(
        { audioBase64, mimeType: `audio/${ext}`, fileName: `answer.${ext}` },
        {
          onSuccess: (text) => {
            if (!mounted.current) return;
            setTranscript(text);
            setAutoFailed(false);
            setPhase('review');
          },
          onError: () => {
            if (!mounted.current) return;
            setTranscript('');
            setAutoFailed(true);
            setPhase('review');
          },
        },
      );
    } catch {
      setTranscript('');
      setAutoFailed(true);
      setPhase('review');
    }
  };

  /** Called when a unit's transcript is confirmed. */
  const confirmUnit = (text: string) => {
    speech.stop();
    const clean = text.trim();
    const difficulty = session.config.difficulty;

    if (unitMode === 'main') {
      setMainTranscript(clean);
      const decision = decideFollowUp(clean, 0, difficulty);
      if (decision.action !== 'none') {
        startUnit('followup', decision.prompt);
        return;
      }
      commitAnswer(clean, []);
      return;
    }

    // follow-up
    const updated = [...followUps, { prompt: unitPrompt, response: clean }];
    setFollowUps(updated);
    const asked = followUpsAsked + 1;
    setFollowUpsAsked(asked);
    const combined = [mainTranscript, ...updated.map((f) => f.response)].join(' ');
    const decision = decideFollowUp(combined, asked, difficulty);
    if (decision.action !== 'none' && asked < DIFFICULTY_META[difficulty].maxFollowUpsPerQuestion) {
      startUnit('followup', decision.prompt);
      return;
    }
    commitAnswer(mainTranscript, updated);
  };

  const startUnit = (mode: 'main' | 'followup', prompt: string) => {
    setUnitMode(mode);
    setUnitPrompt(prompt);
    setTranscript('');
    setAutoFailed(false);
    setPhase('answer');
  };

  const commitAnswer = (main: string, ups: MockFollowUp[]) => {
    const answer: MockAnswer = {
      questionId: current.id,
      questionText: current.prompt,
      kind: current.kind,
      competency: current.competency,
      transcript: main,
      mode: isVoice ? 'voice' : 'text',
      durationMs: Math.max(0, Date.now() - answerStartMs),
      followUps: ups,
    };
    const nextAnswers = [...answers, answer];
    setAnswers(nextAnswers);
    setFollowUps([]);
    setFollowUpsAsked(0);
    setMainTranscript('');

    if (qIndex + 1 < total) {
      const nextIndex = qIndex + 1;
      setQIndex(nextIndex);
      startUnit('main', plan[nextIndex]!.prompt);
    } else {
      finish(nextAnswers);
    }
  };

  const finish = (finalAnswers: MockAnswer[]) => {
    speech.stop();
    setPhase('processing');
    const inProgress: MockSession = { ...session, answers: finalAnswers };
    buildReport.mutate(inProgress, {
      onSuccess: (report) => {
        const completed: MockSession = {
          ...inProgress,
          status: 'completed',
          report,
          completedAt: new Date().toISOString(),
        };
        setSession(completed);
        saveSession.mutate(completed, {
          onSettled: () => router.replace('/mock/report'),
        });
      },
      onError: () => {
        // Persist as completed-without-report is misleading; keep it recoverable.
        if (mounted.current) setPhase('review');
      },
    });
  };

  const exit = () => {
    Alert.alert('Exit interview?', 'Your progress so far will be saved as an unfinished session.', [
      { text: 'Keep going', style: 'cancel' },
      {
        text: 'Exit',
        style: 'destructive',
        onPress: () => {
          speech.stop();
          const abandoned: MockSession = {
            ...session,
            answers,
            status: 'abandoned',
            completedAt: new Date().toISOString(),
          };
          saveSession.mutate(abandoned, {
            onSettled: () => router.replace('/(app)/dashboard'),
          });
        },
      },
    ]);
  };

  // ---- Render ----
  if (phase === 'processing') {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.lg }}>
        <ActivityIndicator size="large" color={theme.brand} />
        <Subtitle>Scoring your interview…</Subtitle>
        <Body muted style={{ textAlign: 'center' }}>
          We’re evaluating each answer against your real experience. This takes a
          few seconds.
        </Body>
        {buildReport.isError ? (
          <Caption style={{ color: theme.danger, textAlign: 'center' }}>
            {toUserMessage(buildReport.error)}
          </Caption>
        ) : null}
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.bg, paddingTop: insets.top }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Top bar */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg }}>
        <Caption muted={false} style={{ color: theme.textMuted }}>
          Question {qIndex + 1} of {total}
        </Caption>
        <Pressable accessibilityRole="button" accessibilityLabel="Exit interview" onPress={exit} hitSlop={12}>
          <Ionicons name="close" size={26} color={theme.text} />
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, padding: spacing.lg, justifyContent: 'center', gap: spacing.xl }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Audio visualization / avatar */}
        <View style={{ alignItems: 'center', gap: spacing.md }}>
          <View
            style={{
              width: 96,
              height: 96,
              borderRadius: 48,
              backgroundColor: theme.surfaceAlt,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: speech.speaking || recorder.isRecording ? 3 : 1,
              borderColor: recorder.isRecording ? theme.danger : speech.speaking ? theme.brand : theme.border,
            }}
          >
            <Ionicons
              name={recorder.isRecording ? 'mic' : speech.speaking ? 'volume-high' : 'person'}
              size={40}
              color={recorder.isRecording ? theme.danger : theme.brand}
            />
          </View>
          {unitMode === 'followup' ? (
            <Caption style={{ color: theme.brand }}>Follow-up</Caption>
          ) : null}
        </View>

        {/* Current question */}
        <Title style={{ textAlign: 'center' }}>{unitPrompt}</Title>

        {/* Answer surface */}
        {phase === 'transcribing' ? (
          <View style={{ alignItems: 'center', gap: spacing.sm }}>
            <ActivityIndicator color={theme.brand} />
            <Caption>Transcribing…</Caption>
          </View>
        ) : phase === 'review' && isVoice ? (
          <View style={{ gap: spacing.sm }}>
            <Caption style={{ color: autoFailed ? theme.warning : theme.textMuted }}>
              {autoFailed
                ? transcribe.error
                  ? toUserMessage(transcribe.error)
                  : 'Transcription unavailable — type what you said.'
                : 'Check the transcript, then continue.'}
            </Caption>
            <TextField
              label="Your answer"
              value={transcript}
              onChangeText={setTranscript}
              multiline
              numberOfLines={6}
              maxLength={MAX_ANSWER_CHARS}
              style={{ minHeight: 140, paddingTop: spacing.md }}
            />
          </View>
        ) : !isVoice ? (
          <TextField
            label="Your answer"
            value={transcript}
            onChangeText={setTranscript}
            multiline
            numberOfLines={7}
            maxLength={MAX_ANSWER_CHARS}
            placeholder="Type your answer…"
            style={{ minHeight: 160, paddingTop: spacing.md }}
          />
        ) : recorder.isRecording ? (
          <Caption style={{ textAlign: 'center', color: theme.danger }}>
            ● Recording {formatMs(elapsedMs)}
          </Caption>
        ) : (
          <Caption style={{ textAlign: 'center' }}>
            Listen to the question, then record your answer.
          </Caption>
        )}
      </ScrollView>

      {/* Controls */}
      <View style={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.md, gap: spacing.sm }}>
        {transcribe.isError && phase === 'review' ? null : null}

        {isVoice && phase === 'answer' && !recorder.isRecording ? (
          <>
            <Button title="🎙  Record answer" onPress={() => void recorder.start()} />
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.lg }}>
              <Button title="🔁 Repeat" variant="ghost" fullWidth={false} onPress={() => void speech.speak(unitPrompt)} />
            </View>
            {recorder.error ? <Caption style={{ color: theme.danger }}>{recorder.error}</Caption> : null}
          </>
        ) : null}

        {isVoice && phase === 'answer' && recorder.isRecording ? (
          <Button title="Finish answer" variant="danger" onPress={() => void finishAnswerVoice()} />
        ) : null}

        {isVoice && phase === 'review' ? (
          <Button
            title="Continue"
            onPress={() => confirmUnit(transcript)}
            disabled={transcript.trim().length < 3}
          />
        ) : null}

        {!isVoice && phase === 'answer' ? (
          <>
            <Button
              title="Finish answer"
              onPress={() => confirmUnit(transcript)}
              disabled={transcript.trim().length < 3}
            />
            <Button title="🔁 Repeat question aloud" variant="ghost" onPress={() => void speech.speak(unitPrompt)} />
          </>
        ) : null}
      </View>
    </KeyboardAvoidingView>
  );
}
