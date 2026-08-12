import { Stack } from 'expo-router';

import { useTheme } from '@/core/ui';

export default function PracticeLayout() {
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
      <Stack.Screen name="index" options={{ title: 'Practice' }} />
      <Stack.Screen name="[competency]" options={{ title: 'Questions' }} />
      <Stack.Screen name="question/[id]" options={{ title: 'Practice' }} />
      <Stack.Screen name="assist/[id]" options={{ title: 'Recall & draft' }} />
      <Stack.Screen name="voice/[id]" options={{ title: 'Voice practice' }} />
      <Stack.Screen name="results" options={{ title: 'Evaluation' }} />
      <Stack.Screen name="improved" options={{ title: 'Improved answer' }} />
      <Stack.Screen name="followups" options={{ title: 'Follow-ups' }} />
      <Stack.Screen name="progress" options={{ title: 'Progress' }} />
      <Stack.Screen name="history" options={{ title: 'My answers' }} />
      <Stack.Screen name="edit" options={{ title: 'Refine answer' }} />
    </Stack>
  );
}
