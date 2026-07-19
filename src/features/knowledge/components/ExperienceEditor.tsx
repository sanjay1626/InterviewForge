import { useState } from 'react';
import { Switch, View } from 'react-native';

import { toUserMessage } from '@/core/domain/errors';
import {
  Body,
  Button,
  Caption,
  Screen,
  TagInput,
  TextField,
  Title,
  spacing,
  useTheme,
} from '@/core/ui';
import { validateRequired } from '@/core/validation/validators';
import type { WorkExperience, WorkExperienceInput } from '../domain/types';
import { useSaveExperience } from '../hooks/useExperiences';

interface ExperienceEditorProps {
  existing?: WorkExperience;
  onSaved: () => void;
}

export function ExperienceEditor({ existing, onSaved }: ExperienceEditorProps) {
  const theme = useTheme();
  const save = useSaveExperience();
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState<WorkExperienceInput>({
    company: existing?.company ?? '',
    title: existing?.title ?? '',
    location: existing?.location ?? '',
    startDate: existing?.startDate ?? '',
    endDate: existing?.endDate ?? '',
    isCurrent: existing?.isCurrent ?? false,
    description: existing?.description ?? '',
    highlights: existing?.highlights ?? [],
    skills: existing?.skills ?? [],
  });

  const set = <K extends keyof WorkExperienceInput>(
    key: K,
    value: WorkExperienceInput[K],
  ) => setForm((f) => ({ ...f, [key]: value }));

  const companyError = submitted ? validateRequired(form.company, 'Company') : null;
  const titleError = submitted ? validateRequired(form.title, 'Title') : null;

  const onSubmit = () => {
    setSubmitted(true);
    if (validateRequired(form.company, 'Company') || validateRequired(form.title, 'Title')) {
      return;
    }
    save.mutate(
      { id: existing?.id, input: form },
      { onSuccess: onSaved },
    );
  };

  return (
    <Screen
      footer={
        <View style={{ gap: spacing.sm }}>
          {save.isError ? (
            <Caption style={{ color: theme.danger }}>
              {toUserMessage(save.error)}
            </Caption>
          ) : null}
          <Button
            title={existing ? 'Save changes' : 'Add experience'}
            onPress={onSubmit}
            loading={save.isPending}
          />
        </View>
      }
    >
      <Title>{existing ? 'Edit experience' : 'Add experience'}</Title>
      <Body muted>Only include what actually happened — real facts make the best answers.</Body>

      <TextField
        label="Company / organization"
        value={form.company}
        onChangeText={(v) => set('company', v)}
        autoCapitalize="words"
        error={companyError}
      />
      <TextField
        label="Title / role"
        value={form.title}
        onChangeText={(v) => set('title', v)}
        autoCapitalize="words"
        error={titleError}
      />
      <TextField
        label="Location (optional)"
        value={form.location}
        onChangeText={(v) => set('location', v)}
      />
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <View style={{ flex: 1 }}>
          <TextField
            label="Start (e.g. 2022-01)"
            value={form.startDate}
            onChangeText={(v) => set('startDate', v)}
            autoCapitalize="none"
          />
        </View>
        <View style={{ flex: 1 }}>
          <TextField
            label="End"
            value={form.endDate}
            onChangeText={(v) => set('endDate', v)}
            editable={!form.isCurrent}
            autoCapitalize="none"
            placeholder={form.isCurrent ? 'Present' : 'e.g. 2024-03'}
          />
        </View>
      </View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Body>I currently work here</Body>
        <Switch
          value={form.isCurrent}
          onValueChange={(v) => set('isCurrent', v)}
          accessibilityLabel="I currently work here"
        />
      </View>
      <TextField
        label="What you did (optional)"
        value={form.description}
        onChangeText={(v) => set('description', v)}
        multiline
        numberOfLines={4}
        style={{ minHeight: 96, paddingTop: spacing.md }}
      />
      <TagInput
        label="Key accomplishments"
        values={form.highlights}
        onChange={(v) => set('highlights', v)}
        hint="Add specific, true results. No need to invent numbers."
      />
      <TagInput
        label="Skills demonstrated"
        values={form.skills}
        onChange={(v) => set('skills', v)}
      />
    </Screen>
  );
}
