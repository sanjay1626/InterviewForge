import { useMemo, useState } from 'react';
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
  TextField,
  Title,
  radius,
  spacing,
  useTheme,
} from '@/core/ui';
import { isCompetency } from '@/core/domain/competencies';
import {
  REFLECTION_QUESTIONS,
  emptyReflection,
  type MemoryCard,
  type ReflectionAnswers,
} from '@/features/practice/domain/assistant';
import { findQuestion } from '@/features/practice/domain/questions';
import {
  useAssistantDraft,
  useMemoryRecall,
} from '@/features/practice/hooks/useAssistant';
import { useAssistantStore } from '@/features/practice/store/assistant-store';

function Chip({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Remove ${label}`}
      onPress={onRemove}
      hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
      style={[styles.chip, { borderColor: theme.border, backgroundColor: theme.surfaceAlt }]}
    >
      <Caption muted={false} style={{ color: theme.text }}>
        {label}  ✕
      </Caption>
    </Pressable>
  );
}

export default function AssistantScreen() {
  const params = useLocalSearchParams<{ id: string; prompt?: string; competency?: string }>();
  const { id } = params;
  const router = useRouter();
  const theme = useTheme();

  // Two entry modes: a library question by id, or a free-text "custom" prompt
  // (id="custom") launched from Fast Prep / Mock so "Help me remember" works for
  // any question — reusing this same recall + grounded-draft flow.
  const isCustom = id === 'custom';
  const libQuestion = !isCustom && id ? findQuestion(id) : undefined;
  const competencyParam =
    params.competency && isCompetency(params.competency) ? params.competency : null;
  const question =
    isCustom
      ? params.prompt
        ? { prompt: params.prompt, competency: competencyParam }
        : undefined
      : libQuestion
        ? { prompt: libQuestion.prompt, competency: libQuestion.competency }
        : undefined;

  const recall = useMemoryRecall(question?.prompt ?? '', question?.competency ?? null);
  const draftMutation = useAssistantDraft();
  const setPendingDraft = useAssistantStore((s) => s.setPendingDraft);

  const [selectedRefs, setSelectedRefs] = useState<string[]>([]);
  const [removedChips, setRemovedChips] = useState<string[]>([]);
  const [reflection, setReflection] = useState<ReflectionAnswers>(emptyReflection());

  const memories = recall.data?.memories ?? [];
  const memoryByRef = useMemo(
    () => new Map(memories.map((m) => [m.ref, m])),
    [memories],
  );

  // Available chips = recall chips ∪ skills from selected memories; minus removed.
  const availableChips = useMemo(() => {
    const set = new Set(recall.data?.chips ?? []);
    for (const ref of selectedRefs) {
      memoryByRef.get(ref)?.skills.forEach((s) => set.add(s));
    }
    return [...set];
  }, [recall.data?.chips, selectedRefs, memoryByRef]);
  const selectedChips = availableChips.filter((c) => !removedChips.includes(c));

  const toggleMemory = (ref: string) =>
    setSelectedRefs((prev) =>
      prev.includes(ref) ? prev.filter((r) => r !== ref) : [...prev, ref],
    );

  const setField = (key: keyof ReflectionAnswers, value: string) =>
    setReflection((r) => ({ ...r, [key]: value }));

  const reflectionFilled = Object.values(reflection).filter((v) => v.trim()).length;
  const canDraft = reflectionFilled >= 2 && !draftMutation.isPending;

  const refLabel = (ref: string): string => {
    if (ref === 'reflection') return 'Your reflection';
    if (ref === 'resume') return 'Resume';
    const m = memoryByRef.get(ref);
    return m ? `${m.sourceLabel}: ${m.title}` : ref;
  };

  const onCreateDraft = () => {
    if (!question || !canDraft) return;
    draftMutation.mutate({
      questionText: question.prompt,
      competency: question.competency,
      chips: selectedChips,
      refs: selectedRefs,
      reflection,
    });
  };

  const useDraft = (text: string) => {
    // Custom prompts have no library practice screen to return to — the recall +
    // draft are the aid; the user takes it back to their mock/prep answer.
    if (isCustom) {
      router.back();
      return;
    }
    setPendingDraft(text);
    router.replace(`/(app)/practice/question/${id}`);
  };

  if (!question) {
    return (
      <Screen scroll={false} center>
        <EmptyView title="Question not found" actionLabel="Go back" onAction={() => router.back()} />
      </Screen>
    );
  }

  const draft = draftMutation.data;

  return (
    <Screen
      footer={
        <View style={{ gap: spacing.sm }}>
          {draftMutation.isError ? (
            <Caption style={{ color: theme.danger }}>
              {toUserMessage(draftMutation.error)}
            </Caption>
          ) : null}
          <Button
            title={draftMutation.isPending ? 'Building your draft…' : 'Create my draft'}
            onPress={onCreateDraft}
            loading={draftMutation.isPending}
            disabled={!canDraft}
          />
          {reflectionFilled < 2 ? (
            <Caption>Answer a couple of the reflection questions first.</Caption>
          ) : (
            <Caption>Your draft uses only your reflection + the sources you kept.</Caption>
          )}
          <Button
            title={isCustom ? 'Done' : 'Skip — just write my own'}
            variant="ghost"
            onPress={() =>
              isCustom ? router.back() : router.replace(`/(app)/practice/question/${id}`)
            }
          />
        </View>
      }
    >
      <Card>
        <Caption style={{ color: theme.brand, fontWeight: '700' }}>QUESTION</Caption>
        <Subtitle>{question.prompt}</Subtitle>
      </Card>

      <Title>Recall your experience</Title>
      <Body muted>
        Before you write, let’s find which of your real experiences fits. I’ll
        only ever use your own material — nothing invented.
      </Body>

      {/* Memory Recall panel */}
      {recall.isLoading ? (
        <LoadingView label="Searching your experience…" />
      ) : recall.isError ? (
        <ErrorView message={toUserMessage(recall.error)} onRetry={() => recall.refetch()} />
      ) : !recall.data?.hasMemories ? (
        <Card>
          <Subtitle>No matching experience yet</Subtitle>
          <Body muted>
            I couldn’t find a matching experience for this question. Let’s build a
            new STAR story together — then it’ll be here next time.
          </Body>
          <Button
            title="Build a STAR story"
            onPress={() => router.push('/(app)/stories/new')}
          />
        </Card>
      ) : (
        <View style={{ gap: spacing.sm }}>
          <Subtitle>
            Possible experiences{' '}
            <Caption>{recall.data.source === 'ai' ? '· AI-ranked' : '· from your records'}</Caption>
          </Subtitle>
          {memories.map((m: MemoryCard) => {
            const selected = selectedRefs.includes(m.ref);
            return (
              <Card
                key={m.ref}
                selected={selected}
                accessibilityLabel={m.title}
                onPress={() => toggleMemory(m.ref)}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Body style={{ fontWeight: '600', flex: 1 }}>{m.title}</Body>
                  <Caption style={{ color: theme.brand }}>{m.sourceLabel}</Caption>
                </View>
                {m.whyRelevant ? (
                  <Caption style={{ color: theme.text }}>💡 {m.whyRelevant}</Caption>
                ) : null}
                {m.situationSummary ? <Caption>{m.situationSummary}</Caption> : null}
                {m.skills.length > 0 ? (
                  <Caption>{m.skills.slice(0, 6).join(' · ')}</Caption>
                ) : null}
                <Caption style={{ color: selected ? theme.success : theme.textMuted }}>
                  {selected ? '✓ Using this' : 'Tap to use'}
                </Caption>
              </Card>
            );
          })}
        </View>
      )}

      {/* Retrieval chips */}
      {selectedChips.length > 0 ? (
        <View style={{ gap: spacing.xs }}>
          <Subtitle>Context to use</Subtitle>
          <Caption>Remove anything you don’t want the draft to lean on.</Caption>
          <View style={styles.chipRow}>
            {selectedChips.map((c) => (
              <Chip key={c} label={c} onRemove={() => setRemovedChips((r) => [...r, c])} />
            ))}
          </View>
        </View>
      ) : null}

      {/* Guided reflection */}
      <View style={{ gap: spacing.sm }}>
        <Subtitle>Reflect first</Subtitle>
        <Body muted>
          Jot down what actually happened in your own words. These become your
          draft — the AI won’t add anything you didn’t say.
        </Body>
        {REFLECTION_QUESTIONS.map((q) => (
          <TextField
            key={q.key}
            label={q.prompt}
            value={reflection[q.key]}
            onChangeText={(v) => setField(q.key, v)}
            multiline
            numberOfLines={2}
            style={{ minHeight: 56, paddingTop: spacing.sm }}
          />
        ))}
      </View>

      {/* Draft result */}
      {draft ? (
        <View style={{ gap: spacing.sm }}>
          <Subtitle style={{ color: theme.brand }}>Your draft</Subtitle>
          <Caption>
            {draft.source === 'ai'
              ? 'Assembled from your reflection and selected sources.'
              : 'Assembled from your reflection.'}
          </Caption>
          {draft.paragraphs.length > 0 ? (
            draft.paragraphs.map((p, i) => (
              <Card key={i}>
                <Body>{p.text}</Body>
                {p.sources.length > 0 ? (
                  <Caption style={{ color: theme.success }}>
                    Sources: {p.sources.map(refLabel).join(' · ')}
                  </Caption>
                ) : null}
              </Card>
            ))
          ) : (
            <Card>
              <Body>{draft.draft}</Body>
            </Card>
          )}
          {draft.missingInfo.length > 0 ? (
            <View style={{ gap: spacing.xs }}>
              <Caption style={{ color: theme.warning }}>Fill these in when you edit:</Caption>
              {draft.missingInfo.map((m, i) => (
                <Caption key={i} style={{ color: theme.warning }}>• {m}</Caption>
              ))}
            </View>
          ) : null}
          <Button
            title={isCustom ? 'Done — take this to your answer' : 'Use this draft & edit'}
            onPress={() => useDraft(draft.draft)}
          />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
});
