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
  { phase: 'Phase 2', title: 'Resume & experience profile', desc: 'Upload a resume and build your knowledge base.' },
  { phase: 'Phase 3', title: 'STAR Story Vault', desc: 'Capture and structure your best stories.' },
  { phase: 'Phase 4', title: 'Practice & evaluation', desc: 'Answer questions and get grounded feedback.' },
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
