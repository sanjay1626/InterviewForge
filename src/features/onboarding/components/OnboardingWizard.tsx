import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { toUserMessage } from '@/core/domain/errors';
import {
  Body,
  Button,
  Caption,
  Screen,
  Subtitle,
  TextField,
  Title,
  spacing,
  useTheme,
} from '@/core/ui';
import { validateRequired } from '@/core/validation/validators';
import { useAuthStore } from '@/features/auth/store/auth-store';
import {
  COMMON_INDUSTRIES,
  EXPERIENCE_LEVELS,
  INTERVIEW_GOALS,
  PRACTICE_MODES,
} from '../domain/constants';
import type {
  ExperienceLevel,
  InterviewGoal,
  PracticeMode,
} from '../domain/types';
import { useCompleteOnboarding } from '../hooks/useProfile';
import { OptionGroup } from './OptionGroup';

interface Draft {
  displayName: string;
  targetRole: string;
  experienceLevel: ExperienceLevel | null;
  industry: string;
  interviewGoals: InterviewGoal[];
  preferredPracticeMode: PracticeMode | null;
}

const TOTAL_STEPS = 5;

interface OnboardingWizardProps {
  onComplete: () => void;
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const theme = useTheme();
  const userId = useAuthStore((s) => s.session?.user.id);
  const completeOnboarding = useCompleteOnboarding(userId);

  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>({
    displayName: '',
    targetRole: '',
    experienceLevel: null,
    industry: '',
    interviewGoals: [],
    preferredPracticeMode: null,
  });
  const [showErrors, setShowErrors] = useState(false);

  const industryOptions = useMemo(
    () => COMMON_INDUSTRIES.map((label) => ({ value: label, label })),
    [],
  );

  const stepValid = ((): boolean => {
    switch (step) {
      case 0:
        return validateRequired(draft.targetRole, 'Target role') === null;
      case 1:
        return draft.experienceLevel !== null;
      case 2:
        return draft.industry.trim().length > 0;
      case 3:
        return draft.interviewGoals.length > 0;
      case 4:
        return draft.preferredPracticeMode !== null;
      default:
        return false;
    }
  })();

  const toggleGoal = (goal: InterviewGoal) => {
    setDraft((d) => ({
      ...d,
      interviewGoals: d.interviewGoals.includes(goal)
        ? d.interviewGoals.filter((g) => g !== goal)
        : [...d.interviewGoals, goal],
    }));
  };

  const goNext = () => {
    if (!stepValid) {
      setShowErrors(true);
      return;
    }
    setShowErrors(false);
    if (step < TOTAL_STEPS - 1) {
      setStep((s) => s + 1);
    } else {
      submit();
    }
  };

  const goBack = () => {
    setShowErrors(false);
    setStep((s) => Math.max(0, s - 1));
  };

  const submit = () => {
    if (
      !draft.experienceLevel ||
      !draft.preferredPracticeMode ||
      draft.interviewGoals.length === 0
    ) {
      setShowErrors(true);
      return;
    }
    completeOnboarding.mutate(
      {
        displayName: draft.displayName.trim(),
        targetRole: draft.targetRole.trim(),
        experienceLevel: draft.experienceLevel,
        industry: draft.industry.trim(),
        interviewGoals: draft.interviewGoals,
        preferredPracticeMode: draft.preferredPracticeMode,
      },
      { onSuccess: onComplete },
    );
  };

  return (
    <Screen
      footer={
        <View style={{ gap: spacing.sm }}>
          {completeOnboarding.isError ? (
            <Caption style={{ color: theme.danger }}>
              {toUserMessage(completeOnboarding.error)}
            </Caption>
          ) : null}
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {step > 0 ? (
              <View style={{ flex: 1 }}>
                <Button title="Back" variant="ghost" onPress={goBack} />
              </View>
            ) : null}
            <View style={{ flex: 2 }}>
              <Button
                title={step === TOTAL_STEPS - 1 ? 'Finish' : 'Continue'}
                onPress={goNext}
                loading={completeOnboarding.isPending}
              />
            </View>
          </View>
        </View>
      }
    >
      <Caption>
        Step {step + 1} of {TOTAL_STEPS}
      </Caption>

      {step === 0 ? (
        <View style={{ gap: spacing.lg }}>
          <Title>Let’s set up your practice</Title>
          <Body muted>
            Tell us the role you’re aiming for. We only use what you provide — we
            never invent experience for you.
          </Body>
          <TextField
            label="Your name (optional)"
            value={draft.displayName}
            onChangeText={(displayName) => setDraft((d) => ({ ...d, displayName }))}
            placeholder="Alex Rivera"
            autoCapitalize="words"
          />
          <TextField
            label="Target role"
            value={draft.targetRole}
            onChangeText={(targetRole) => setDraft((d) => ({ ...d, targetRole }))}
            placeholder="e.g. Product Manager, Backend Engineer"
            autoCapitalize="words"
            error={
              showErrors ? validateRequired(draft.targetRole, 'Target role') : null
            }
          />
        </View>
      ) : null}

      {step === 1 ? (
        <View style={{ gap: spacing.lg }}>
          <Subtitle>What’s your experience level?</Subtitle>
          <OptionGroup
            options={EXPERIENCE_LEVELS}
            selected={draft.experienceLevel}
            onSelect={(experienceLevel) =>
              setDraft((d) => ({ ...d, experienceLevel }))
            }
          />
          {showErrors && !draft.experienceLevel ? (
            <Caption style={{ color: theme.danger }}>Pick one to continue.</Caption>
          ) : null}
        </View>
      ) : null}

      {step === 2 ? (
        <View style={{ gap: spacing.lg }}>
          <Subtitle>Which industry are you targeting?</Subtitle>
          <TextField
            label="Industry"
            value={draft.industry}
            onChangeText={(industry) => setDraft((d) => ({ ...d, industry }))}
            placeholder="Type or pick below"
            error={
              showErrors && !draft.industry.trim() ? 'Industry is required.' : null
            }
          />
          <OptionGroup
            options={industryOptions}
            selected={draft.industry}
            onSelect={(industry) => setDraft((d) => ({ ...d, industry }))}
          />
        </View>
      ) : null}

      {step === 3 ? (
        <View style={{ gap: spacing.lg }}>
          <Subtitle>What are your goals?</Subtitle>
          <Body muted>Select all that apply.</Body>
          <OptionGroup
            options={INTERVIEW_GOALS}
            selected={draft.interviewGoals}
            onSelect={toggleGoal}
          />
          {showErrors && draft.interviewGoals.length === 0 ? (
            <Caption style={{ color: theme.danger }}>
              Choose at least one goal.
            </Caption>
          ) : null}
        </View>
      ) : null}

      {step === 4 ? (
        <View style={{ gap: spacing.lg }}>
          <Subtitle>How do you prefer to practice?</Subtitle>
          <OptionGroup
            options={PRACTICE_MODES}
            selected={draft.preferredPracticeMode}
            onSelect={(preferredPracticeMode) =>
              setDraft((d) => ({ ...d, preferredPracticeMode }))
            }
          />
          {showErrors && !draft.preferredPracticeMode ? (
            <Caption style={{ color: theme.danger }}>Pick one to continue.</Caption>
          ) : null}
        </View>
      ) : null}
    </Screen>
  );
}
