import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { toUserMessage } from '@/core/domain/errors';
import {
  Body,
  Button,
  Caption,
  ErrorView,
  LoadingView,
  Screen,
  TagInput,
  Title,
  spacing,
  useTheme,
} from '@/core/ui';
import { useAuthStore } from '@/features/auth/store/auth-store';
import {
  useProfile,
  useUpdateProfileExtras,
} from '@/features/onboarding/hooks/useProfile';

export default function SkillsScreen() {
  const theme = useTheme();
  const userId = useAuthStore((s) => s.session?.user.id);
  const profile = useProfile(userId);
  const update = useUpdateProfileExtras(userId);

  const [skills, setSkills] = useState<string[]>([]);
  const [certifications, setCertifications] = useState<string[]>([]);

  // Seed local state once the profile loads.
  useEffect(() => {
    if (profile.data) {
      setSkills(profile.data.skills);
      setCertifications(profile.data.certifications);
    }
  }, [profile.data]);

  if (profile.isLoading) {
    return (
      <Screen scroll={false} center>
        <LoadingView label="Loading…" />
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

  return (
    <Screen
      footer={
        <View style={{ gap: spacing.sm }}>
          {update.isError ? (
            <Caption style={{ color: theme.danger }}>
              {toUserMessage(update.error)}
            </Caption>
          ) : update.isSuccess ? (
            <Caption style={{ color: theme.success }}>Saved.</Caption>
          ) : null}
          <Button
            title="Save"
            loading={update.isPending}
            onPress={() => update.mutate({ skills, certifications })}
          />
        </View>
      }
    >
      <Title>Skills & certifications</Title>
      <Body muted>
        List skills and certifications you genuinely have. These help tailor
        questions and ground your answers.
      </Body>

      <TagInput
        label="Skills"
        values={skills}
        onChange={setSkills}
        placeholder="e.g. Stakeholder management"
      />
      <TagInput
        label="Certifications"
        values={certifications}
        onChange={setCertifications}
        placeholder="e.g. PMP, AWS SA"
      />
    </Screen>
  );
}
