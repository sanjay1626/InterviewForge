import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { competencyLabel } from '@/core/domain/competencies';
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
  radius,
  spacing,
  useTheme,
} from '@/core/ui';
import {
  STAR_STATUS_META,
  type StarStatus,
  type StarStory,
} from '@/features/stories/domain/types';
import { useDeleteStory, useStories } from '@/features/stories/hooks/useStories';

type Filter = 'all' | StarStatus;
const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'ready', label: 'Ready' },
  { value: 'needs_details', label: 'Needs details' },
  { value: 'draft', label: 'Draft' },
];

function statusColor(status: StarStatus, theme: ReturnType<typeof useTheme>) {
  if (status === 'ready') return theme.success;
  if (status === 'needs_details') return theme.warning;
  return theme.textMuted;
}

export default function StoryVaultScreen() {
  const theme = useTheme();
  const router = useRouter();
  const stories = useStories();
  const remove = useDeleteStory();
  const [filter, setFilter] = useState<Filter>('all');

  const visible = (stories.data ?? []).filter(
    (s) => filter === 'all' || s.status === filter,
  );

  const confirmDelete = (story: StarStory) => {
    Alert.alert('Delete story', `Remove "${story.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => remove.mutate(story.id) },
    ]);
  };

  return (
    <Screen
      footer={
        <Button
          title="New STAR story"
          onPress={() => router.push('/(app)/stories/new')}
        />
      }
    >
      <Body muted>
        Your library of real stories, structured in STAR. Mark them ready when
        they’re interview-ready.
      </Body>

      <View style={styles.filterRow}>
        {FILTERS.map((f) => {
          const active = filter === f.value;
          return (
            <Pressable
              key={f.value}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`Filter ${f.label}`}
              onPress={() => setFilter(f.value)}
              style={[
                styles.filter,
                {
                  borderColor: active ? theme.brand : theme.border,
                  backgroundColor: active ? theme.brand : theme.surface,
                },
              ]}
            >
              <Caption
                muted={false}
                style={{ color: active ? theme.textOnBrand : theme.text }}
              >
                {f.label}
              </Caption>
            </Pressable>
          );
        })}
      </View>

      {stories.isLoading ? (
        <LoadingView label="Loading stories…" />
      ) : stories.isError ? (
        <ErrorView
          message={toUserMessage(stories.error)}
          onRetry={() => stories.refetch()}
        />
      ) : (stories.data?.length ?? 0) === 0 ? (
        <EmptyView
          title="No stories yet"
          message="Build your first STAR story from a real experience."
          actionLabel="New STAR story"
          onAction={() => router.push('/(app)/stories/new')}
        />
      ) : visible.length === 0 ? (
        <EmptyView title="Nothing here" message="No stories match this filter." />
      ) : (
        <View style={{ gap: spacing.sm }}>
          {visible.map((story) => (
            <Card
              key={story.id}
              accessibilityLabel={story.title}
              onPress={() => router.push(`/(app)/stories/${story.id}`)}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Subtitle style={{ flex: 1 }}>{story.title}</Subtitle>
                <Caption
                  style={{ color: statusColor(story.status, theme), fontWeight: '700' }}
                >
                  {STAR_STATUS_META[story.status].label.toUpperCase()}
                </Caption>
              </View>
              {story.company || story.project ? (
                <Caption>
                  {[story.company, story.project].filter(Boolean).join(' · ')}
                </Caption>
              ) : null}
              {story.competencies.length > 0 ? (
                <Caption>
                  {story.competencies.map(competencyLabel).slice(0, 3).join(' · ')}
                </Caption>
              ) : null}
              <View style={{ alignSelf: 'flex-start', marginTop: spacing.xs }}>
                <Button
                  title="Delete"
                  variant="ghost"
                  fullWidth={false}
                  onPress={() => confirmDelete(story)}
                />
              </View>
            </Card>
          ))}
        </View>
      )}
      {remove.isError ? (
        <Caption style={{ color: theme.danger }}>
          {toUserMessage(remove.error)}
        </Caption>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  filter: {
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    minHeight: 44,
    justifyContent: 'center',
  },
});
