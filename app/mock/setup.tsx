import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { newId } from '@/core/utils/id';
import {
  Body,
  Button,
  Caption,
  OptionGroup,
  Subtitle,
  TextField,
  Title,
  spacing,
  useTheme,
  type SelectOption,
} from '@/core/ui';
import { useAuthStore } from '@/features/auth/store/auth-store';
import { useProfile } from '@/features/onboarding/hooks/useProfile';
import { useDocuments } from '@/features/knowledge/hooks/useDocuments';
import { computeProgress } from '@/features/practice/domain/progress';
import { useRecentAttempts } from '@/features/practice/hooks/usePractice';
import { useStories } from '@/features/stories/hooks/useStories';
import {
  DIFFICULTY_META,
  LENGTH_META,
  TYPE_META,
  defaultMockConfig,
  estimatedMinutes,
  type MockDifficulty,
  type MockInterviewType,
  type MockLength,
  type MockResponseMode,
} from '@/features/mock/domain/config';
import { buildInterviewPlan } from '@/features/mock/domain/plan';
import type { MockSession } from '@/features/mock/domain/session';
import { useMockStore } from '@/features/mock/store/mock-store';

const TYPE_OPTIONS: SelectOption<MockInterviewType>[] = (
  ['behavioral', 'resume', 'mixed'] as MockInterviewType[]
).map((v) => ({ value: v, label: TYPE_META[v].label, description: TYPE_META[v].description }));

const LENGTH_OPTIONS: SelectOption<MockLength>[] = (
  ['quick', 'standard', 'full'] as MockLength[]
).map((v) => ({
  value: v,
  label: LENGTH_META[v].label,
  description: `${LENGTH_META[v].questionCount} questions · ${LENGTH_META[v].approxMinutes}`,
}));

const DIFFICULTY_OPTIONS: SelectOption<MockDifficulty>[] = (
  ['supportive', 'realistic', 'challenging'] as MockDifficulty[]
).map((v) => ({ value: v, label: DIFFICULTY_META[v].label, description: DIFFICULTY_META[v].description }));

const MODE_OPTIONS: SelectOption<MockResponseMode>[] = [
  { value: 'voice', label: 'Voice', description: 'Speak your answers aloud' },
  { value: 'text', label: 'Text', description: 'Type your answers' },
];

export default function MockSetupScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const userId = useAuthStore((s) => s.session?.user.id);

  const profile = useProfile(userId);
  const documents = useDocuments();
  const attempts = useRecentAttempts(100);
  const stories = useStories();

  const [config, setConfig] = useState(defaultMockConfig());

  useEffect(() => {
    if (profile.data?.targetRole && !config.targetRole) {
      setConfig((c) => ({ ...c, targetRole: profile.data!.targetRole! }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.data?.targetRole]);

  const setSession = useMockStore((s) => s.setSession);

  const weakCompetencies = useMemo(() => {
    const summary = computeProgress(attempts.data ?? [], stories.data ?? []);
    return [...summary.competencyScores]
      .sort((a, b) => a.average - b.average)
      .map((c) => c.competency);
  }, [attempts.data, stories.data]);

  const hasResume = (documents.data ?? []).some((d) => d.status === 'ready');
  const set = <K extends keyof typeof config>(k: K, v: (typeof config)[K]) =>
    setConfig((c) => ({ ...c, [k]: v }));

  const start = () => {
    const plan = buildInterviewPlan(config, {
      weakCompetencies,
      hasResume,
      roleTitle: config.targetRole,
    });
    const now = new Date().toISOString();
    const session: MockSession = {
      id: newId(),
      config,
      status: 'in_progress',
      plan,
      answers: [],
      report: null,
      startedAt: now,
      completedAt: null,
      createdAt: now,
    };
    setSession(session);
    router.replace('/mock/room');
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.bg, paddingTop: insets.top }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.lg }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={() => router.back()}
          hitSlop={12}
        >
          <Ionicons name="close" size={26} color={theme.text} />
        </Pressable>
        <Subtitle style={{ marginLeft: spacing.md }}>Mock interview</Subtitle>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg }}
        keyboardShouldPersistTaps="handled"
      >
        <Title>Set up your interview</Title>
        <Body muted>
          A realistic, one-question-at-a-time simulation. Feedback comes only at
          the end — just like the real thing.
        </Body>

        <TextField
          label="Target role"
          value={config.targetRole}
          onChangeText={(v) => set('targetRole', v)}
          placeholder="e.g. Backend Engineer"
          autoCapitalize="words"
        />
        <TextField
          label="Company (optional)"
          value={config.company}
          onChangeText={(v) => set('company', v)}
          placeholder="e.g. Acme"
        />
        <TextField
          label="Paste a job description (optional)"
          value={config.jobDescription}
          onChangeText={(v) => set('jobDescription', v)}
          multiline
          numberOfLines={3}
          style={{ minHeight: 72, paddingTop: spacing.md }}
        />

        <View style={{ gap: spacing.sm }}>
          <Subtitle>Interview type</Subtitle>
          <OptionGroup options={TYPE_OPTIONS} selected={config.type} onSelect={(v) => set('type', v)} />
        </View>
        <View style={{ gap: spacing.sm }}>
          <Subtitle>Session length</Subtitle>
          <OptionGroup options={LENGTH_OPTIONS} selected={config.length} onSelect={(v) => set('length', v)} />
        </View>
        <View style={{ gap: spacing.sm }}>
          <Subtitle>Difficulty</Subtitle>
          <OptionGroup options={DIFFICULTY_OPTIONS} selected={config.difficulty} onSelect={(v) => set('difficulty', v)} />
        </View>
        <View style={{ gap: spacing.sm }}>
          <Subtitle>Response mode</Subtitle>
          <OptionGroup options={MODE_OPTIONS} selected={config.responseMode} onSelect={(v) => set('responseMode', v)} />
        </View>

        <Caption>
          Estimated duration: ~{estimatedMinutes(config.length)} minutes ·{' '}
          {LENGTH_META[config.length].questionCount} questions
        </Caption>
      </ScrollView>

      <View
        style={{
          padding: spacing.lg,
          paddingBottom: insets.bottom + spacing.md,
          borderTopColor: theme.border,
          borderTopWidth: 1,
        }}
      >
        <Button
          title="Start mock interview"
          onPress={start}
          disabled={!config.targetRole.trim()}
        />
      </View>
    </KeyboardAvoidingView>
  );
}
