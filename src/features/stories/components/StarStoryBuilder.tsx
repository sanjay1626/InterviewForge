import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { COMPETENCIES, type Competency } from '@/core/domain/competencies';
import { toUserMessage } from '@/core/domain/errors';
import {
  Body,
  Button,
  Caption,
  Card,
  OptionGroup,
  Screen,
  Subtitle,
  TagInput,
  TextField,
  Title,
  radius,
  spacing,
  useTheme,
  type SelectOption,
} from '@/core/ui';
import { validateRequired } from '@/core/validation/validators';
import { useExperiences } from '@/features/knowledge/hooks/useExperiences';
import { useProjects } from '@/features/knowledge/hooks/useProjects';
import {
  assembleNarrative,
  clampStatus,
  estimateSpokenSeconds,
  missingStarParts,
  STAR_PARTS,
} from '../domain/star-helpers';
import { STAR_STATUS_META, type StarStatus, type StarStory, type StarStoryInput } from '../domain/types';
import { useSaveStory } from '../hooks/useStories';

const STATUS_OPTIONS: SelectOption<StarStatus>[] = (
  ['draft', 'needs_details', 'ready'] as StarStatus[]
).map((value) => ({
  value,
  label: STAR_STATUS_META[value].label,
  description: STAR_STATUS_META[value].description,
}));

function emptyForm(): StarStoryInput {
  return {
    title: '',
    situation: '',
    task: '',
    action: '',
    result: '',
    lesson: '',
    skills: [],
    competencies: [],
    company: '',
    project: '',
    tags: [],
    status: 'draft',
  };
}

function fromStory(story: StarStory): StarStoryInput {
  return {
    title: story.title,
    situation: story.situation ?? '',
    task: story.task ?? '',
    action: story.action ?? '',
    result: story.result ?? '',
    lesson: story.lesson ?? '',
    skills: story.skills,
    competencies: story.competencies,
    company: story.company ?? '',
    project: story.project ?? '',
    tags: story.tags,
    status: story.status,
  };
}

interface StarStoryBuilderProps {
  existing?: StarStory;
  onSaved: () => void;
}

export function StarStoryBuilder({ existing, onSaved }: StarStoryBuilderProps) {
  const theme = useTheme();
  const save = useSaveStory();
  const experiences = useExperiences();
  const projects = useProjects();

  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState<StarStoryInput>(
    existing ? fromStory(existing) : emptyForm(),
  );

  const set = <K extends keyof StarStoryInput>(key: K, value: StarStoryInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const toggleCompetency = (value: Competency) =>
    setForm((f) => ({
      ...f,
      competencies: f.competencies.includes(value)
        ? f.competencies.filter((c) => c !== value)
        : [...f.competencies, value],
    }));

  const narrative = useMemo(() => assembleNarrative(form), [form]);
  const missing = useMemo(() => missingStarParts(form), [form]);
  const seconds = estimateSpokenSeconds(narrative);
  const effectiveStatus = clampStatus(form.status, form);

  const titleError = submitted ? validateRequired(form.title, 'Title') : null;

  const onSubmit = () => {
    setSubmitted(true);
    if (validateRequired(form.title, 'Title')) return;
    save.mutate({ id: existing?.id, input: form }, { onSuccess: onSaved });
  };

  const companyChips = (experiences.data ?? [])
    .map((e) => e.company)
    .filter((c, i, arr) => c && arr.indexOf(c) === i)
    .slice(0, 6);
  const projectChips = (projects.data ?? []).map((p) => p.name).slice(0, 6);

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
            title={existing ? 'Save story' : 'Create story'}
            onPress={onSubmit}
            loading={save.isPending}
          />
        </View>
      }
    >
      <Title>{existing ? 'Edit story' : 'Build a STAR story'}</Title>
      <Body muted>
        Answer in your own words. We structure your notes into STAR — we never
        invent situations, results, or numbers for you.
      </Body>

      <TextField
        label="Title"
        value={form.title}
        onChangeText={(v) => set('title', v)}
        placeholder="e.g. Rescued a slipping launch"
        error={titleError}
      />

      {companyChips.length > 0 || projectChips.length > 0 ? (
        <View style={{ gap: spacing.xs }}>
          <Caption>Link to your experience (optional)</Caption>
          <View style={styles.chipRow}>
            {companyChips.map((c) => (
              <Pressable
                key={`c-${c}`}
                accessibilityRole="button"
                accessibilityLabel={`Use company ${c}`}
                onPress={() => set('company', c as string)}
                style={[styles.chip, { borderColor: theme.border, backgroundColor: theme.surfaceAlt }]}
              >
                <Caption muted={false} style={{ color: theme.text }}>{c}</Caption>
              </Pressable>
            ))}
            {projectChips.map((p) => (
              <Pressable
                key={`p-${p}`}
                accessibilityRole="button"
                accessibilityLabel={`Use project ${p}`}
                onPress={() => set('project', p)}
                style={[styles.chip, { borderColor: theme.border, backgroundColor: theme.surfaceAlt }]}
              >
                <Caption muted={false} style={{ color: theme.text }}>{p}</Caption>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <View style={{ flex: 1 }}>
          <TextField
            label="Company (optional)"
            value={form.company}
            onChangeText={(v) => set('company', v)}
          />
        </View>
        <View style={{ flex: 1 }}>
          <TextField
            label="Project (optional)"
            value={form.project}
            onChangeText={(v) => set('project', v)}
          />
        </View>
      </View>

      {STAR_PARTS.map((part) => (
        <TextField
          key={part.key}
          label={part.label}
          hint={part.prompt}
          value={form[part.key]}
          onChangeText={(v) => set(part.key, v)}
          multiline
          numberOfLines={4}
          style={{ minHeight: 96, paddingTop: spacing.md }}
        />
      ))}

      <TextField
        label="Lesson learned (optional)"
        hint="What did you take away that you'd apply again?"
        value={form.lesson}
        onChangeText={(v) => set('lesson', v)}
        multiline
        numberOfLines={3}
        style={{ minHeight: 72, paddingTop: spacing.md }}
      />

      <TagInput
        label="Skills demonstrated"
        values={form.skills}
        onChange={(v) => set('skills', v)}
      />
      <TagInput label="Tags" values={form.tags} onChange={(v) => set('tags', v)} />

      <View style={{ gap: spacing.sm }}>
        <Subtitle>Competencies</Subtitle>
        <Caption>Which behavioral areas does this story show?</Caption>
        <OptionGroup
          options={COMPETENCIES}
          selected={form.competencies}
          onSelect={toggleCompetency}
        />
      </View>

      {/* Live, fact-preserving preview assembled from the user's own words. */}
      <Card>
        <Subtitle>Assembled preview</Subtitle>
        <Caption>Built only from your words · ~{seconds || 0}s spoken</Caption>
        {narrative ? (
          <Body>{narrative}</Body>
        ) : (
          <Body muted>Fill in the STAR sections to see your story here.</Body>
        )}
        {missing.length > 0 ? (
          <Caption style={{ color: theme.warning }}>
            Still needs: {missing.map((m) => m.label).join(', ')}
          </Caption>
        ) : (
          <Caption style={{ color: theme.success }}>
            All STAR parts are filled in.
          </Caption>
        )}
      </Card>

      <View style={{ gap: spacing.sm }}>
        <Subtitle>Status</Subtitle>
        <OptionGroup
          options={STATUS_OPTIONS}
          selected={form.status}
          onSelect={(v) => set('status', v)}
        />
        {form.status === 'ready' && effectiveStatus !== 'ready' ? (
          <Caption style={{ color: theme.warning }}>
            This will be saved as “Needs details” until every STAR part is filled.
          </Caption>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
});
