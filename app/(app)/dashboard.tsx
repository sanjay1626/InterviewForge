import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { toUserMessage } from '@/core/domain/errors';
import {
  Body,
  Caption,
  Card,
  ErrorView,
  LoadingView,
  Screen,
  Subtitle,
  Title,
  spacing,
  useTheme,
} from '@/core/ui';
import { EXPERIENCE_LEVELS, INTERVIEW_GOALS } from '@/features/onboarding/domain/constants';
import { useAuthStore } from '@/features/auth/store/auth-store';
import { useProfile } from '@/features/onboarding/hooks/useProfile';

const UPCOMING = [
  { phase: 'Phase 5', title: 'Voice practice', desc: 'Record, transcribe, and hear improved answers.' },
  { phase: 'Phase 6', title: 'Progress dashboard', desc: 'Track scores, streaks, and weak spots.' },
];

function labelFor<T extends string>(
  options: { value: T; label: string }[],
  value: T | null,
): string | null {
  return options.find((o) => o.value === value)?.label ?? null;
}

export default function DashboardScreen() {
  const theme = useTheme();
  const session = useAuthStore((s) => s.session);
  const isGuest = session?.user.mode === 'guest';
  const profile = useProfile(session?.user.id);
  const router = useRouter();

  if (profile.isLoading) {
    return (
      <Screen scroll={false} center>
        <LoadingView label="Loading your profile…" />
      </Screen>
    );
  }

  if (profile.isError) {
    return (
      <Screen scroll={false} center>
        <ErrorView
          message={toUserMessage(profile.error)}
          onRetry={() => profile.refetch()}
        />
      </Screen>
    );
  }

  const p = profile.data;
  const greetingName = p?.displayName?.trim() || 'there';
  const experienceLabel = labelFor(EXPERIENCE_LEVELS, p?.experienceLevel ?? null);
  const goalLabels = (p?.interviewGoals ?? [])
    .map((g) => labelFor(INTERVIEW_GOALS, g))
    .filter((x): x is string => Boolean(x));

  return (
    <Screen>
      <View style={{ gap: spacing.xs }}>
        <Caption>WELCOME</Caption>
        <Title>Hi {greetingName} 👋</Title>
        {isGuest ? (
          <Caption style={{ color: theme.warning }}>
            Guest mode — data is stored on this device only.
          </Caption>
        ) : null}
      </View>

      <Card>
        <Subtitle>Your target</Subtitle>
        <Body>{p?.targetRole ?? 'Not set yet'}</Body>
        {experienceLabel ? <Caption>{experienceLabel}</Caption> : null}
        {p?.industry ? <Caption>Industry: {p.industry}</Caption> : null}
        {goalLabels.length > 0 ? (
          <Caption>Goals: {goalLabels.join(', ')}</Caption>
        ) : null}
      </Card>

      <Card
        accessibilityLabel="Start practicing"
        onPress={() => router.push('/(app)/practice')}
      >
        <Caption style={{ color: theme.brand, fontWeight: '700' }}>PRACTICE</Caption>
        <Subtitle>Practice a behavioral question</Subtitle>
        <Caption>
          Answer real questions and get a structured, fact-grounded evaluation
          with a STAR-formatted improvement.
        </Caption>
      </Card>

      <Card
        accessibilityLabel="Build your knowledge base"
        onPress={() => router.push('/(app)/knowledge')}
      >
        <Caption style={{ color: theme.brand, fontWeight: '700' }}>
          KNOWLEDGE BASE
        </Caption>
        <Subtitle>Build your knowledge base</Subtitle>
        <Caption>
          Add your resume, work experience, and projects so practice answers stay
          grounded in your real experience.
        </Caption>
      </Card>

      <Card
        accessibilityLabel="STAR Story Vault"
        onPress={() => router.push('/(app)/stories')}
      >
        <Caption style={{ color: theme.brand, fontWeight: '700' }}>
          STAR STORIES
        </Caption>
        <Subtitle>Build your STAR story vault</Subtitle>
        <Caption>
          Turn real experiences into structured stories you can reuse across many
          behavioral questions.
        </Caption>
      </Card>

      <View style={{ gap: spacing.sm }}>
        <Subtitle>Coming next</Subtitle>
        <Body muted>
          The foundation is ready. Each phase below unlocks a new part of your
          interview prep.
        </Body>
        {UPCOMING.map((item) => (
          <Card key={item.title}>
            <Caption style={{ color: theme.brand, fontWeight: '700' }}>
              {item.phase.toUpperCase()}
            </Caption>
            <Body style={{ fontWeight: '600' }}>{item.title}</Body>
            <Caption>{item.desc}</Caption>
          </Card>
        ))}
      </View>
    </Screen>
  );
}
