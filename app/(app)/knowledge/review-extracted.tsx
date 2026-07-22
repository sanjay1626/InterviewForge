import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { toUserMessage } from '@/core/domain/errors';
import {
  Body,
  Button,
  Caption,
  Card,
  EmptyView,
  ErrorView,
  LoadingView,
  Screen,
  Subtitle,
  Title,
  radius,
  spacing,
  useTheme,
} from '@/core/ui';
import { isEmptyExtraction } from '@/features/knowledge/data/normalize-extraction';
import type { ExtractedProfile } from '@/features/knowledge/domain/types';
import {
  useApproveExtraction,
  useExtractProfile,
} from '@/features/knowledge/hooks/useExtractProfile';
import { useExtractionStore } from '@/features/knowledge/store/extraction-store';

/** Small tappable pill used to include/exclude an extracted tag. */
function TagPill({
  label,
  selected,
  onToggle,
}: {
  label: string;
  selected: boolean;
  onToggle: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${selected ? 'Remove' : 'Include'} ${label}`}
      onPress={onToggle}
      hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
      style={[
        styles.pill,
        {
          borderColor: selected ? theme.brand : theme.border,
          backgroundColor: selected ? theme.brand : theme.surface,
        },
      ]}
    >
      <Caption
        muted={false}
        style={{ color: selected ? theme.textOnBrand : theme.textMuted }}
      >
        {label}
      </Caption>
    </Pressable>
  );
}

export default function ReviewExtractedScreen() {
  const { documentId } = useLocalSearchParams<{ documentId: string }>();
  const router = useRouter();
  const theme = useTheme();

  const extract = useExtractProfile();
  const approve = useApproveExtraction();

  const [result, setResult] = useState<ExtractedProfile | null>(null);
  const [expOn, setExpOn] = useState<boolean[]>([]);
  const [projOn, setProjOn] = useState<boolean[]>([]);
  const [skillsOn, setSkillsOn] = useState<string[]>([]);
  const [certsOn, setCertsOn] = useState<string[]>([]);

  const stored = useExtractionStore((s) =>
    s.documentId && s.documentId === documentId ? s.result : null,
  );

  const seed = (data: ExtractedProfile) => {
    setResult(data);
    setExpOn(data.experiences.map(() => true));
    setProjOn(data.projects.map(() => true));
    setSkillsOn(data.skills);
    setCertsOn(data.certifications);
  };

  // Prefer the result captured during upload; only extract again if we arrived
  // here without one (e.g. a deep link or a re-visit).
  useEffect(() => {
    if (!documentId || result) return;
    if (stored) {
      seed(stored);
      return;
    }
    let active = true;
    extract.mutate(documentId, {
      onSuccess: (data) => {
        if (active) seed(data);
      },
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId, stored]);

  const selectedCount = useMemo(
    () =>
      expOn.filter(Boolean).length +
      projOn.filter(Boolean).length +
      skillsOn.length +
      certsOn.length,
    [expOn, projOn, skillsOn, certsOn],
  );

  if (extract.isPending) {
    return (
      <Screen scroll={false} center>
        <LoadingView label="Reading your resume…" />
      </Screen>
    );
  }

  if (extract.isError) {
    return (
      <Screen scroll={false} center>
        <ErrorView
          message={toUserMessage(extract.error)}
          onRetry={() => documentId && extract.mutate(documentId)}
        />
      </Screen>
    );
  }

  if (!result || isEmptyExtraction(result)) {
    return (
      <Screen scroll={false} center>
        <EmptyView
          title="Nothing to import"
          message="We couldn’t find experiences, projects, or skills in this resume. You can add them manually."
          actionLabel="Go back"
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  const onSave = () => {
    approve.mutate(
      {
        experiences: result.experiences.filter((_, i) => expOn[i]),
        projects: result.projects.filter((_, i) => projOn[i]),
        skills: skillsOn,
        certifications: certsOn,
      },
      { onSuccess: () => router.replace('/(app)/knowledge') },
    );
  };

  const toggleAt = (
    list: boolean[],
    setList: (v: boolean[]) => void,
    index: number,
  ) => setList(list.map((v, i) => (i === index ? !v : v)));

  const toggleTag = (
    list: string[],
    setList: (v: string[]) => void,
    value: string,
  ) =>
    setList(
      list.includes(value) ? list.filter((v) => v !== value) : [...list, value],
    );

  return (
    <Screen
      footer={
        <View style={{ gap: spacing.sm }}>
          {approve.isError ? (
            <Caption style={{ color: theme.danger }}>
              {toUserMessage(approve.error)}
            </Caption>
          ) : null}
          <Button
            title={`Add ${selectedCount} item${selectedCount === 1 ? '' : 's'} to my profile`}
            onPress={onSave}
            loading={approve.isPending}
            disabled={selectedCount === 0 || approve.isPending}
          />
          <Caption>
            You can edit everything afterwards in Work experience, Projects, and
            Skills.
          </Caption>
        </View>
      }
    >
      <Title>Review what we found</Title>
      <Body muted>
        Taken straight from your resume — nothing was invented. Untick anything
        you don’t want, then add the rest.
      </Body>

      {result.experiences.length > 0 ? (
        <View style={{ gap: spacing.sm }}>
          <Subtitle>Work experience ({result.experiences.length})</Subtitle>
          {result.experiences.map((exp, i) => (
            <Card
              key={`${exp.company}-${exp.title}-${i}`}
              selected={expOn[i]}
              accessibilityLabel={`${exp.title} at ${exp.company}`}
              onPress={() => toggleAt(expOn, setExpOn, i)}
            >
              <Body style={{ fontWeight: '600' }}>
                {exp.title || '(no title)'}
              </Body>
              <Caption>
                {[exp.company, exp.location].filter(Boolean).join(' · ')}
                {exp.startDate || exp.endDate
                  ? ` · ${exp.startDate}${exp.endDate ? ` – ${exp.endDate}` : exp.isCurrent ? ' – Present' : ''}`
                  : ''}
              </Caption>
              {exp.highlights.length > 0 ? (
                <Caption>{exp.highlights.length} bullet point(s)</Caption>
              ) : null}
              {exp.skills.length > 0 ? (
                <Caption>{exp.skills.slice(0, 5).join(', ')}</Caption>
              ) : null}
              <Caption style={{ color: expOn[i] ? theme.success : theme.textMuted }}>
                {expOn[i] ? '✓ Will be added' : 'Skipped'}
              </Caption>
            </Card>
          ))}
        </View>
      ) : null}

      {result.projects.length > 0 ? (
        <View style={{ gap: spacing.sm }}>
          <Subtitle>Projects ({result.projects.length})</Subtitle>
          {result.projects.map((project, i) => (
            <Card
              key={`${project.name}-${i}`}
              selected={projOn[i]}
              accessibilityLabel={project.name}
              onPress={() => toggleAt(projOn, setProjOn, i)}
            >
              <Body style={{ fontWeight: '600' }}>{project.name}</Body>
              {project.role ? <Caption>{project.role}</Caption> : null}
              {project.skills.length > 0 ? (
                <Caption>{project.skills.slice(0, 5).join(', ')}</Caption>
              ) : null}
              <Caption style={{ color: projOn[i] ? theme.success : theme.textMuted }}>
                {projOn[i] ? '✓ Will be added' : 'Skipped'}
              </Caption>
            </Card>
          ))}
        </View>
      ) : null}

      {result.skills.length > 0 ? (
        <View style={{ gap: spacing.sm }}>
          <Subtitle>Skills ({skillsOn.length}/{result.skills.length})</Subtitle>
          <View style={styles.pillRow}>
            {result.skills.map((skill) => (
              <TagPill
                key={skill}
                label={skill}
                selected={skillsOn.includes(skill)}
                onToggle={() => toggleTag(skillsOn, setSkillsOn, skill)}
              />
            ))}
          </View>
        </View>
      ) : null}

      {result.certifications.length > 0 ? (
        <View style={{ gap: spacing.sm }}>
          <Subtitle>
            Certifications ({certsOn.length}/{result.certifications.length})
          </Subtitle>
          <View style={styles.pillRow}>
            {result.certifications.map((cert) => (
              <TagPill
                key={cert}
                label={cert}
                selected={certsOn.includes(cert)}
                onToggle={() => toggleTag(certsOn, setCertsOn, cert)}
              />
            ))}
          </View>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  pill: {
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
});
