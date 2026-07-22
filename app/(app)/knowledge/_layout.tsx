import { Stack } from 'expo-router';

import { useTheme } from '@/core/ui';

export default function KnowledgeLayout() {
  const theme = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerShadowVisible: false,
        headerStyle: { backgroundColor: theme.bg },
        headerTitleStyle: { color: theme.text },
        headerTintColor: theme.brand,
        contentStyle: { backgroundColor: theme.bg },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Knowledge profile' }} />
      <Stack.Screen name="resume" options={{ title: 'Resume' }} />
      <Stack.Screen name="review-extracted" options={{ title: 'Review resume' }} />
      <Stack.Screen name="skills" options={{ title: 'Skills & certifications' }} />
      <Stack.Screen name="experience/index" options={{ title: 'Work experience' }} />
      <Stack.Screen name="experience/[id]" options={{ title: 'Experience' }} />
      <Stack.Screen name="projects/index" options={{ title: 'Projects' }} />
      <Stack.Screen name="projects/[id]" options={{ title: 'Project' }} />
    </Stack>
  );
}
