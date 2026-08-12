import { Stack } from 'expo-router';

import { useTheme } from '@/core/ui';

/** Full-screen mock-interview stack, presented above the tab navigator. */
export default function MockLayout() {
  const theme = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.bg },
        gestureEnabled: false, // don't let a swipe abandon the interview by accident
      }}
    >
      <Stack.Screen name="setup" />
      <Stack.Screen name="room" />
      <Stack.Screen name="report" />
    </Stack>
  );
}
