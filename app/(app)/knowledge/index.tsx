import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { View } from 'react-native';

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
import { useAuthStore } from '@/features/auth/store/auth-store';
import { useProfile } from '@/features/onboarding/hooks/useProfile';
import { useDocuments } from '@/features/knowledge/hooks/useDocuments';
import { useExperiences } from '@/features/knowledge/hooks/useExperiences';
import { useProjects } from '@/features/knowledge/hooks/useProjects';

function countLabel(
  query: { isLoading: boolean; isError: boolean; data?: unknown[] },
  noun: string,
): string {
  if (query.isLoading) return 'Loading…';
  if (query.isError) return 'Could not load';
  const n = query.data?.length ?? 0;
  return `${n} ${noun}${n === 1 ? '' : 's'}`;
}

export default function KnowledgeHubScreen() {
  const theme = useTheme();
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const isGuest = session?.user.mode === 'guest';

  const documents = useDocuments();
  const experiences = useExperiences();
  const projects = useProjects();
  const profile = useProfile(session?.user.id);

  const readyDocs =
    documents.data?.filter((d) => d.status === 'ready').length ?? 0;
  const skillsCount =
    (profile.data?.skills.length ?? 0) + (profile.data?.certifications.length ?? 0);

  const rows: {
    key: string;
    title: string;
    subtitle: string;
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
  }[] = [
    {
      key: 'resume',
      title: 'Resume',
      subtitle: documents.isLoading
        ? 'Loading…'
        : `${countLabel(documents, 'document')}${readyDocs ? ` · ${readyDocs} analyzed` : ''}`,
      icon: 'document-text-outline',
      onPress: () => router.push('/(app)/knowledge/resume'),
    },
    {
      key: 'experience',
      title: 'Work experience',
      subtitle: countLabel(experiences, 'entry'),
      icon: 'briefcase-outline',
      onPress: () => router.push('/(app)/knowledge/experience'),
    },
    {
      key: 'projects',
      title: 'Projects',
      subtitle: countLabel(projects, 'project'),
      icon: 'construct-outline',
      onPress: () => router.push('/(app)/knowledge/projects'),
    },
    {
      key: 'skills',
      title: 'Skills & certifications',
      subtitle: profile.isLoading ? 'Loading…' : `${skillsCount} item${skillsCount === 1 ? '' : 's'}`,
      icon: 'ribbon-outline',
      onPress: () => router.push('/(app)/knowledge/skills'),
    },
  ];

  return (
    <Screen>
      <View style={{ gap: spacing.xs }}>
        <Title>Your knowledge base</Title>
        <Body muted>
          Everything here is used to ground your practice answers in your real
          experience. Nothing is invented on your behalf.
        </Body>
        {isGuest ? (
          <Caption style={{ color: theme.warning }}>
            Guest mode: experience and projects are saved on this device. Resume
            analysis needs an account.
          </Caption>
        ) : null}
      </View>

      <View style={{ gap: spacing.sm }}>
        {rows.map((row) => (
          <Card key={row.key} accessibilityLabel={row.title} onPress={row.onPress}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
              }}
            >
              <Ionicons name={row.icon} size={24} color={theme.brand} />
              <View style={{ flex: 1 }}>
                <Subtitle>{row.title}</Subtitle>
                <Caption>{row.subtitle}</Caption>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={theme.textMuted}
              />
            </View>
          </Card>
        ))}
      </View>
    </Screen>
  );
}
