import { Link, Stack } from 'expo-router';

import { Body, Screen, Title, spacing } from '@/core/ui';
import { useTheme } from '@/core/ui';

export default function NotFoundScreen() {
  const theme = useTheme();
  return (
    <>
      <Stack.Screen options={{ title: 'Not found' }} />
      <Screen center>
        <Title>This screen doesn’t exist.</Title>
        <Body muted style={{ marginTop: spacing.md }}>
          The page you’re looking for isn’t available.
        </Body>
        <Link href="/" style={{ marginTop: spacing.lg, color: theme.brand }}>
          Go to home
        </Link>
      </Screen>
    </>
  );
}
