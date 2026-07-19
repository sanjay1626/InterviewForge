import { useState } from 'react';
import { View } from 'react-native';

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
import type { Project, ProjectInput } from '../domain/types';
import { useSaveProject } from '../hooks/useProjects';

interface ProjectEditorProps {
  existing?: Project;
  onSaved: () => void;
}

export function ProjectEditor({ existing, onSaved }: ProjectEditorProps) {
  const theme = useTheme();
  const save = useSaveProject();
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState<ProjectInput>({
    name: existing?.name ?? '',
    role: existing?.role ?? '',
    description: existing?.description ?? '',
    highlights: existing?.highlights ?? [],
    skills: existing?.skills ?? [],
    link: existing?.link ?? '',
    startDate: existing?.startDate ?? '',
    endDate: existing?.endDate ?? '',
  });

  const set = <K extends keyof ProjectInput>(key: K, value: ProjectInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const nameError = submitted ? validateRequired(form.name, 'Project name') : null;

  const onSubmit = () => {
    setSubmitted(true);
    if (validateRequired(form.name, 'Project name')) return;
    save.mutate({ id: existing?.id, input: form }, { onSuccess: onSaved });
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
            title={existing ? 'Save changes' : 'Add project'}
            onPress={onSubmit}
            loading={save.isPending}
          />
        </View>
      }
    >
      <Title>{existing ? 'Edit project' : 'Add project'}</Title>
      <Body muted>Describe a real project and your actual role in it.</Body>

      <TextField
        label="Project name"
        value={form.name}
        onChangeText={(v) => set('name', v)}
        error={nameError}
      />
      <TextField
        label="Your role (optional)"
        value={form.role}
        onChangeText={(v) => set('role', v)}
      />
      <TextField
        label="Description (optional)"
        value={form.description}
        onChangeText={(v) => set('description', v)}
        multiline
        numberOfLines={4}
        style={{ minHeight: 96, paddingTop: spacing.md }}
      />
      <TextField
        label="Link (optional)"
        value={form.link}
        onChangeText={(v) => set('link', v)}
        autoCapitalize="none"
        keyboardType="url"
      />
      <TagInput
        label="Highlights"
        values={form.highlights}
        onChange={(v) => set('highlights', v)}
        hint="Specific, true outcomes only."
      />
      <TagInput
        label="Skills / tools used"
        values={form.skills}
        onChange={(v) => set('skills', v)}
      />
    </Screen>
  );
}
