import { Stack } from 'expo-router';

/** Full-screen Fast Interview Prep flow: setup → dashboard. */
export default function PrepLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, gestureEnabled: false }}>
      <Stack.Screen name="setup" />
      <Stack.Screen name="dashboard" />
    </Stack>
  );
}
