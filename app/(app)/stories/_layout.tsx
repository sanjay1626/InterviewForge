import { Stack } from 'expo-router';

import { useTheme } from '@/core/ui';

export default function StoriesLayout() {
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
      <Stack.Screen name="index" options={{ title: 'STAR Story Vault' }} />
      <Stack.Screen name="[id]" options={{ title: 'Story' }} />
    </Stack>
  );
}
