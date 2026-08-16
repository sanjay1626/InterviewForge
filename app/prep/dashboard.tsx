import { useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { competencyLabel } from '@/core/domain/competencies';
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
  radius,
  spacing,
  useTheme,
  type Theme,
} from '@/core/ui';
import type { MatchStatus, RequirementMatch } from '@/features/prep/domain/matching';
import type { PrepPriority, PrepQuestion, PrepQuestionCategory } from '@/features/prep/domain/questions';
import { useBuildPrep, useSavePrep, useSavedPrep } from '@/features/prep/hooks/usePrep';
import { usePrepStore } from '@/features/prep/store/prep-store';

const PRIORITY_LABEL: Record<PrepPriority, string> = {
  high: 'High priority',
  medium: 'Medium',
  bonus: 'Bonus',
};

const CATEGORY_LABEL: Record<PrepQuestionCategory, string> = {
  behavioral: 'Behavioral',
  technical: 'Technical',
  resume_deep_dive: 'Resume deep-dive',
  project_deep_dive: 'Project deep-dive',
  role_specific: 'Role-specific',
};

function priorityColor(theme: Theme, p: PrepPriority): string {
  return p === 'high' ? theme.danger : p === 'medium' ? theme.warning : theme.textMuted;
}

function statusColor(theme: Theme, s: MatchStatus): string {
  return s === 'strong' ? theme.success : s === 'partial' ? theme.warning : theme.danger;
}

function Pill({ text, color }: { text: string; color: string }) {
  return (
    <View style={[styles.pill, { borderColor: color }]}>
      <Caption muted={false} style={{ color, fontWeight: '700' }}>
        {text}
      </Caption>
    </View>
  );
}

function SectionHeader({ kicker, title }: { kicker: string; title: string }) {
  const theme = useTheme();
  return (
    <View style={{ gap: spacing.xs }}>
      <Caption style={{ color: theme.brand, fontWeight: '700' }}>{kicker}</Caption>
      <Subtitle>{title}</Subtitle>
    </View>
  );
}

function HelpMeRemember({
  prompt,
  competency,
}: {
  prompt: string;
  competency?: string | null;
}) {
  const theme = useTheme();
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Help me remember"
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      onPress={() =>
        router.push({
          pathname: '/(app)/practice/assist/[id]',
          params: { id: 'custom', prompt, competency: competency ?? '' },
        })
      }
    >
      <Caption style={{ color: theme.brand, fontWeight: '700' }}>💡 Help me remember →</Caption>
    </Pressable>
  );
}

function QuestionCard({ q }: { q: PrepQuestion }) {
  const theme = useTheme();
  return (
    <Card>
      <View style={styles.pillRow}>
        <Pill text={CATEGORY_LABEL[q.category]} color={theme.brand} />
        <Pill text={PRIORITY_LABEL[q.priority]} color={priorityColor(theme, q.priority)} />
      </View>
      <Body>{q.prompt}</Body>
      {q.rationale ? <Caption>{q.rationale}</Caption> : null}
      <HelpMeRemember prompt={q.prompt} competency={q.competency} />
    </Card>
  );
}

function MatchRow({ m }: { m: RequirementMatch }) {
  const theme = useTheme();
  return (
    <View style={styles.matchRow}>
      <View
        style={[styles.dot, { backgroundColor: statusColor(theme, m.status) }]}
        accessibilityLabel={`${m.status} match`}
      />
      <View style={{ flex: 1 }}>
        <Body>{m.requirement.text}</Body>
        <Caption>{m.rationale}</Caption>
      </View>
    </View>
  );
}

export default function PrepDashboardScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Reopen mode: a saved package id in the URL. Otherwise show the just-built
  // package held in the store.
  const { savedId } = useLocalSearchParams<{ savedId?: string }>();
  const storePkg = usePrepStore((s) => s.pkg);
  const storeSavedId = usePrepStore((s) => s.savedId);
  const setPackage = usePrepStore((s) => s.setPackage);
  const setSavedId = usePrepStore((s) => s.setSavedId);

  const saved = useSavedPrep(savedId);
  const save = useSavePrep();
  const rebuild = useBuildPrep();

  const pkg = savedId ? (saved.data ?? null) : storePkg;

  // Auto-save a freshly generated package once, so the user can reopen it later.
  useEffect(() => {
    if (!savedId && storePkg && !storeSavedId && !save.isPending) {
      save.mutate(storePkg, { onSuccess: (id) => setSavedId(id) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedId, storePkg, storeSavedId]);

  const onRegenerate = () => {
    if (!pkg) return;
    rebuild.mutate({ input: pkg.input }, { onSuccess: (p) => setPackage(p) });
  };

  if (savedId && saved.isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, paddingTop: insets.top }}>
        <LoadingView label="Loading your prep…" />
      </View>
    );
  }

  if (!pkg) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, paddingTop: insets.top }}>
        <EmptyView
          title="No prep yet"
          message="Build a prep package to see your plan."
          actionLabel="Build prep"
          onAction={() => router.replace('/prep/setup')}
        />
      </View>
    );
  }

  const { analysis, summary, matches, questions, studyTopics, readiness, suggestedStories, needsInput, answers } = pkg;
  const gaps = matches.filter((m) => m.status === 'none');
  const strong = matches.filter((m) => m.status === 'strong');
  const partial = matches.filter((m) => m.status === 'partial');

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.lg }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={() => router.replace('/(app)/dashboard')}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="close" size={26} color={theme.text} />
        </Pressable>
        <Subtitle style={{ marginLeft: spacing.md }}>Your interview prep</Subtitle>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xxl, gap: spacing.xl }}
      >
        {/* Header */}
        <View style={{ gap: spacing.xs }}>
          <Title>{analysis.jobTitle}</Title>
          {pkg.input.company ? <Body muted>{pkg.input.company}</Body> : null}
          {pkg.source === 'offline' ? (
            <Caption style={{ color: theme.textMuted }}>
              Built offline from your data. Connect the AI backend for a sharper analysis.
            </Caption>
          ) : null}
        </View>

        {/* Readiness */}
        <View style={{ gap: spacing.md }}>
          <SectionHeader kicker="READINESS" title="How ready are you?" />
          <Card>
            {readiness.map((r) => (
              <View key={r.category} style={{ gap: spacing.xs, marginBottom: spacing.sm }}>
                <ScoreBar label={r.label} value={r.score} max={100} />
                <Caption>{r.explanation}</Caption>
                {r.actions.map((a, i) => (
                  <Caption key={i} style={{ color: theme.brand }}>• {a}</Caption>
                ))}
              </View>
            ))}
          </Card>
        </View>

        {/* Job match */}
        <View style={{ gap: spacing.md }}>
          <SectionHeader kicker="JOB MATCH" title="You vs. the requirements" />
          <Card>
            <View style={styles.pillRow}>
              <Pill text={`${strong.length} strong`} color={theme.success} />
              <Pill text={`${partial.length} partial`} color={theme.warning} />
              <Pill text={`${gaps.length} gaps`} color={theme.danger} />
            </View>
            <Caption>
              {summary.coverageScore}% weighted coverage of the role’s requirements.
            </Caption>
          </Card>
          {[...strong, ...partial, ...gaps].slice(0, 12).map((m) => (
            <Card key={m.requirement.id}>
              <MatchRow m={m} />
            </Card>
          ))}
        </View>

        {/* Needs your input */}
        {needsInput.length > 0 ? (
          <View style={{ gap: spacing.md }}>
            <SectionHeader kicker="NEEDS YOUR INPUT" title="A few quick questions" />
            <Body muted>
              Answer these in a sentence or two and we’ll turn them into grounded
              stories — nothing is assumed on your behalf.
            </Body>
            {needsInput.map((n, i) => (
              <Card key={i}>
                <Caption style={{ color: theme.warning }}>{n.evidenceHint}</Caption>
                <Body>{n.question}</Body>
                <HelpMeRemember prompt={n.question} />
              </Card>
            ))}
          </View>
        ) : null}

        {/* Personalized answers */}
        {answers.length > 0 ? (
          <View style={{ gap: spacing.md }}>
            <SectionHeader kicker="PERSONALIZED ANSWERS" title="Grounded starter drafts" />
            <Body muted>
              Drafted only from your verified experience. Anything in [brackets] is
              a gap for you to fill — never invented.
            </Body>
            {answers.map((a, i) => (
              <Card key={i}>
                <Subtitle>{a.questionText}</Subtitle>
                <Body>{a.answer}</Body>
                {a.sources.length > 0 ? (
                  <Caption>Sources: {a.sources.join(', ')}</Caption>
                ) : null}
                {a.missingInfo.map((mi, j) => (
                  <Caption key={j} style={{ color: theme.warning }}>Add: {mi}</Caption>
                ))}
              </Card>
            ))}
          </View>
        ) : null}

        {/* Likely questions */}
        <View style={{ gap: spacing.md }}>
          <SectionHeader kicker="LIKELY QUESTIONS" title={`${questions.length} questions to prepare`} />
          {questions.slice(0, 20).map((q) => (
            <QuestionCard key={q.id} q={q} />
          ))}
        </View>

        {/* Suggested stories */}
        {suggestedStories.length > 0 ? (
          <View style={{ gap: spacing.md }}>
            <SectionHeader kicker="STORY IDEAS" title="Turn experience into STAR stories" />
            {suggestedStories.map((s, i) => (
              <Card
                key={i}
                accessibilityLabel={`Complete story: ${s.title}`}
                onPress={() =>
                  router.push({
                    pathname: '/(app)/stories/[id]',
                    params: {
                      id: 'new',
                      title: s.title,
                      competency: s.competencies[0] ?? '',
                      company: pkg.input.company,
                    },
                  })
                }
              >
                <Subtitle>{s.title}</Subtitle>
                <Caption>
                  Competencies: {s.competencies.map(competencyLabel).join(', ')}
                </Caption>
                <Caption>From: {s.evidenceSource}</Caption>
                {s.missingInfo.length > 0 ? (
                  <Caption style={{ color: theme.warning }}>
                    Still needs: {s.missingInfo.join('; ')}
                  </Caption>
                ) : null}
                <Caption style={{ color: theme.brand, fontWeight: '700' }}>
                  Complete this story →
                </Caption>
              </Card>
            ))}
          </View>
        ) : null}

        {/* Study guide */}
        {studyTopics.length > 0 ? (
          <View style={{ gap: spacing.md }}>
            <SectionHeader kicker="QUICK STUDY GUIDE" title="Topics to review" />
            {studyTopics.map((t, i) => (
              <Card key={i}>
                <Subtitle>{t.topic}</Subtitle>
                <Caption>{t.whyItMatters}</Caption>
                <Body muted>{t.refresher}</Body>
              </Card>
            ))}
          </View>
        ) : null}

        {/* CTA */}
        <View style={{ gap: spacing.sm }}>
          <Button
            title="Start a mock interview"
            onPress={() => router.push({ pathname: '/mock/setup', params: { fromPrep: '1' } })}
          />
          <Button
            title={rebuild.isPending ? 'Regenerating…' : 'Regenerate this prep'}
            variant="secondary"
            onPress={onRegenerate}
            loading={rebuild.isPending}
          />
          <Button
            title="Build prep for another role"
            variant="ghost"
            onPress={() => router.replace('/prep/setup')}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  pill: {
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  matchRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
});
