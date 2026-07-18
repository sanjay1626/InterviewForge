import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { toUserMessage } from '@/core/domain/errors';
import { Body, Button, Caption, Screen, Title, spacing, useTheme } from '@/core/ui';
import { useSignInAsGuest } from '@/features/auth/hooks/useAuthActions';

export default function WelcomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const guest = useSignInAsGuest();

  return (
    <Screen center>
      <View style={{ gap: spacing.md }}>
        <Caption style={{ color: theme.brand, fontWeight: '700' }}>
          INTERVIEWFORGE AI
        </Caption>
        <Title>Practice behavioral interviews with your real experience.</Title>
        <Body muted>
          Turn your work, projects, and STAR stories into clear, confident
          answers. We help you communicate your authentic experience — we never
          invent accomplishments or metrics for you.
        </Body>
      </View>

      <View style={{ gap: spacing.sm, marginTop: spacing.xl }}>
        <Button
          title="Create an account"
          onPress={() => router.push('/(auth)/register')}
        />
        <Button
          title="I already have an account"
          variant="secondary"
          onPress={() => router.push('/(auth)/login')}
        />
        <Button
          title="Continue as guest"
          variant="ghost"
          loading={guest.isPending}
          onPress={() => guest.mutate()}
        />
        {guest.isError ? (
          <Caption style={{ color: theme.danger }}>
            {toUserMessage(guest.error)}
          </Caption>
        ) : (
          <Caption>
            Guest mode is local-only for demos. Cloud sync needs an account.
          </Caption>
        )}
      </View>
    </Screen>
  );
}
