import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { COMPETENCIES } from '@/core/domain/competencies';
import {
  Body,
  Caption,
  Card,
  Screen,
  Subtitle,
  Title,
  spacing,
  useTheme,
} from '@/core/ui';
import {
  QUESTION_LIBRARY,
  questionsByCompetency,
} from '@/features/practice/domain/questions';

const FOUNDATIONAL = QUESTION_LIBRARY.filter((q) => q.isFoundational);

export default function PracticeBrowserScreen() {
  const theme = useTheme();
  const router = useRouter();

  return (
    <Screen>
      <View style={{ gap: spacing.xs }}>
        <Title>Behavioral practice</Title>
        <Body muted>
          Pick a competency and practice real questions. Feedback is grounded in
          your own experience — never invented.
        </Body>
      </View>

      <Card
        accessibilityLabel="My answers"
        onPress={() => router.push('/(app)/practice/history')}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <Ionicons name="bookmarks-outline" size={22} color={theme.brand} />
          <View style={{ flex: 1 }}>
            <Body style={{ fontWeight: '600' }}>My answers</Body>
            <Caption>Reopen, refine, and re-evaluate your saved answers</Caption>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
        </View>
      </Card>

      <Card
        accessibilityLabel="View your progress"
        onPress={() => router.push('/(app)/practice/progress')}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <Ionicons name="stats-chart-outline" size={22} color={theme.brand} />
          <View style={{ flex: 1 }}>
            <Body style={{ fontWeight: '600' }}>Your progress</Body>
            <Caption>Scores, streak, strengths, and what to practice next</Caption>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
        </View>
      </Card>

      <View style={{ gap: spacing.sm }}>
        <Subtitle>Start here</Subtitle>
        <Caption>The three most common behavioral questions.</Caption>
        {FOUNDATIONAL.map((q) => (
          <Card
            key={q.id}
            accessibilityLabel={q.prompt}
            onPress={() => router.push(`/(app)/practice/question/${q.id}`)}
          >
            <Body style={{ fontWeight: '600' }}>{q.prompt}</Body>
          </Card>
        ))}
      </View>

      <View style={{ gap: spacing.sm }}>
        <Subtitle>By competency</Subtitle>
        {COMPETENCIES.map((c) => {
          const count = questionsByCompetency(c.value).length;
          return (
            <Card
              key={c.value}
              accessibilityLabel={c.label}
              onPress={() => router.push(`/(app)/practice/${c.value}`)}
            >
              <View
                style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}
              >
                <Ionicons name="chatbubbles-outline" size={22} color={theme.brand} />
                <View style={{ flex: 1 }}>
                  <Body style={{ fontWeight: '600' }}>{c.label}</Body>
                  <Caption>{c.description} · {count} questions</Caption>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
              </View>
            </Card>
          );
        })}
      </View>
    </Screen>
  );
}
