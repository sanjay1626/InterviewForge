import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pressable, ScrollView, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { toUserMessage } from '@/core/domain/errors';
import {
  Body,
  Button,
  Caption,
  Card,
  EmptyView,
  LoadingView,
  ScoreBar,
  Subtitle,
  Title,
  spacing,
  useTheme,
} from '@/core/ui';
import type { MockReport, QuestionReport } from '@/features/mock/domain/session';
import { useMockReport } from '@/features/mock/hooks/useMock';
import { useMockStore } from '@/features/mock/store/mock-store';
import { usePracticeUiStore } from '@/features/practice/store/practice-ui-store';

function scoreColor(v: number, theme: ReturnType<typeof useTheme>) {
  return v >= 70 ? theme.success : v >= 40 ? theme.warning : theme.danger;
}

function QuestionCard({ q, index }: { q: QuestionReport; index: number }) {
  const theme = useTheme();
  const router = useRouter();
  const setLast = usePracticeUiStore((s) => s.setLast);

  const rePractice = () => {
    setLast({
      attemptId: null,
      questionText: q.questionText,
      competency: q.competency,
      answer: q.transcript,
      mode: q.mode,
      evaluation: q.evaluation,
    });
    router.push('/(app)/practice/results');
  };

  return (
    <Card>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Caption>Q{index + 1}</Caption>
        <Caption style={{ color: scoreColor(q.evaluation.overallScore, theme), fontWeight: '700' }}>
          {q.evaluation.overallScore}/100
        </Caption>
      </View>
      <Body style={{ fontWeight: '600' }}>{q.questionText}</Body>

      <Caption style={{ marginTop: spacing.xs }}>YOUR ANSWER</Caption>
      <Body muted>{q.transcript || '(no answer captured)'}</Body>

      {q.followUps.length > 0 ? (
        <View style={{ gap: 2, marginTop: spacing.xs }}>
          <Caption>FOLLOW-UPS</Caption>
          {q.followUps.map((f, i) => (
            <Caption key={i}>• {f.prompt} — {f.response || '(no response)'}</Caption>
          ))}
        </View>
      ) : null}

      {q.evaluation.strengths.length > 0 ? (
        <Caption style={{ color: theme.success, marginTop: spacing.xs }}>
          ✓ {q.evaluation.strengths.slice(0, 2).join(' · ')}
        </Caption>
      ) : null}
      {q.evaluation.missingDetails.length > 0 ? (
        <Caption style={{ color: theme.warning }}>
          Missing: {q.evaluation.missingDetails.slice(0, 2).join(' · ')}
        </Caption>
      ) : null}

      {q.evaluation.improvedAnswer ? (
        <View style={{ marginTop: spacing.xs }}>
          <Caption style={{ color: theme.brand }}>IMPROVED (STAR)</Caption>
          <Body>{q.evaluation.improvedAnswer}</Body>
          {q.evaluation.factsUsed.length > 0 ? (
            <Caption style={{ color: theme.success }}>
              Sources: {q.evaluation.factsUsed.slice(0, 3).join(' · ')}
            </Caption>
          ) : null}
        </View>
      ) : null}

      <View style={{ marginTop: spacing.sm }}>
        <Button title="Re-practice this question" variant="secondary" onPress={rePractice} />
      </View>
    </Card>
  );
}

function ReportBody({ report }: { report: MockReport }) {
  const theme = useTheme();
  const strongest = report.questions[report.strongestIndex];
  const weakest = report.questions[report.weakestIndex];

  return (
    <View style={{ gap: spacing.lg }}>
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Caption>INTERVIEW READINESS</Caption>
            <Title style={{ color: scoreColor(report.overallScore, theme) }}>{report.overallScore}/100</Title>
          </View>
          <Caption style={{ color: report.source === 'ai' ? theme.brand : theme.warning, fontWeight: '700' }}>
            {report.source === 'ai' ? 'AI · GROUNDED' : 'OFFLINE ESTIMATE'}
          </Caption>
        </View>
      </Card>

      <View style={{ gap: spacing.sm }}>
        <Subtitle>Scorecard</Subtitle>
        <Card>
          <View style={{ gap: spacing.sm }}>
            <ScoreBar label="Relevance to role" value={report.relevanceToRole} max={100} />
            <ScoreBar label="Communication" value={report.communicationScore} max={100} />
            <ScoreBar label="STAR completeness" value={report.starCompleteness} max={100} />
            <ScoreBar label="Specificity & ownership" value={report.specificityOwnership} max={100} />
            <ScoreBar label="Results & impact" value={report.resultsImpact} max={100} />
            <ScoreBar label="Conciseness" value={report.conciseness} max={100} />
          </View>
        </Card>
      </View>

      {report.competencyScores.length > 0 ? (
        <View style={{ gap: spacing.sm }}>
          <Subtitle>By competency</Subtitle>
          <Card>
            <View style={{ gap: spacing.sm }}>
              {report.competencyScores.map((c) => (
                <ScoreBar key={c.competency} label={c.label} value={c.score} max={100} />
              ))}
            </View>
          </Card>
        </View>
      ) : null}

      <View style={{ gap: spacing.xs }}>
        <Subtitle>Delivery</Subtitle>
        {report.speakingPaceWpm !== null ? (
          <Caption>
            Speaking pace: {report.speakingPaceWpm} wpm{' '}
            {report.speakingPaceWpm > 170 ? '(a touch fast)' : report.speakingPaceWpm < 110 ? '(a touch slow)' : '(good)'}
          </Caption>
        ) : null}
        <Caption style={{ color: report.fillerRate > 4 ? theme.warning : theme.textMuted }}>
          Filler words: {report.fillerCount} ({report.fillerRate}/100)
        </Caption>
      </View>

      {strongest ? (
        <Caption style={{ color: theme.success }}>
          Strongest answer: “{strongest.questionText}” ({strongest.evaluation.overallScore})
        </Caption>
      ) : null}
      {weakest ? (
        <Caption style={{ color: theme.warning }}>
          Weakest answer: “{weakest.questionText}” ({weakest.evaluation.overallScore})
        </Caption>
      ) : null}

      {report.unsupportedClaims.length > 0 ? (
        <View style={{ gap: spacing.xs }}>
          <Subtitle style={{ color: theme.danger }}>Double-check these claims</Subtitle>
          {report.unsupportedClaims.map((c, i) => (
            <Caption key={i} style={{ color: theme.danger }}>• {c}</Caption>
          ))}
        </View>
      ) : null}

      {report.recommendedNext.length > 0 ? (
        <View style={{ gap: spacing.xs }}>
          <Subtitle>Recommended next</Subtitle>
          {report.recommendedNext.map((r, i) => (
            <Caption key={i}>• {r}</Caption>
          ))}
        </View>
      ) : null}

      <View style={{ gap: spacing.sm }}>
        <Subtitle>Question-by-question</Subtitle>
        {report.questions.map((q, i) => (
          <QuestionCard key={i} q={q} index={i} />
        ))}
      </View>
    </View>
  );
}

export default function MockReportScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { sessionId } = useLocalSearchParams<{ sessionId?: string }>();

  const storeSession = useMockStore((s) => s.session);
  const remote = useMockReport(sessionId);

  const report =
    storeSession?.report ?? (sessionId ? remote.data?.report ?? null : null);
  const status = storeSession?.status ?? remote.data?.status;

  const close = () => router.replace('/(app)/dashboard');

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg }}>
        <Title>Your report</Title>
        <Pressable accessibilityRole="button" accessibilityLabel="Done" onPress={close} hitSlop={12}>
          <Ionicons name="close" size={26} color={theme.text} />
        </Pressable>
      </View>

      {sessionId && remote.isLoading && !storeSession ? (
        <LoadingView label="Loading report…" />
      ) : !report ? (
        <EmptyView
          title={status === 'abandoned' ? 'Interview not completed' : 'No report available'}
          message={
            status === 'abandoned'
              ? 'This session was exited early, so it was not scored.'
              : 'Finish a mock interview to see your report.'
          }
          actionLabel="Back to dashboard"
          onAction={close}
        />
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xxl }}>
          <ReportBody report={report} />
          <View style={{ marginTop: spacing.xl }}>
            <Button title="Done" onPress={close} />
          </View>
        </ScrollView>
      )}
    </View>
  );
}
