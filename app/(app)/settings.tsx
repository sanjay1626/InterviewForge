import { View } from 'react-native';

import { env } from '@/core/config/env';
import { toUserMessage } from '@/core/domain/errors';
import {
  Body,
  Button,
  Caption,
  Card,
  Screen,
  Subtitle,
  spacing,
  useTheme,
} from '@/core/ui';
import { useSignOut } from '@/features/auth/hooks/useAuthActions';
import { useAuthStore } from '@/features/auth/store/auth-store';

export default function SettingsScreen() {
  const theme = useTheme();
  const session = useAuthStore((s) => s.session);
  const signOut = useSignOut();
  const isGuest = session?.user.mode === 'guest';

  return (
    <Screen>
      <Card>
        <Subtitle>Account</Subtitle>
        <Body>{isGuest ? 'Guest (local only)' : session?.user.email ?? '—'}</Body>
        <Caption>
          {isGuest
            ? 'Create an account to sync your data across devices.'
            : 'Signed in with email and password.'}
        </Caption>
      </Card>

      <Card>
        <Subtitle>Backend</Subtitle>
        <Body>
          {env.isSupabaseConfigured ? 'Supabase connected' : 'Not configured'}
        </Body>
        <Caption>
          {env.isSupabaseConfigured
            ? 'Cloud accounts, storage, and AI features are available.'
            : 'Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to enable cloud features.'}
        </Caption>
      </Card>

      <Card>
        <Subtitle>Privacy commitment</Subtitle>
        <Caption>
          InterviewForge only uses the experience you provide. It never invents
          employment history, metrics, or accomplishments on your behalf.
        </Caption>
      </Card>

      <View style={{ gap: spacing.sm }}>
        <Button
          title={isGuest ? 'Exit guest mode' : 'Sign out'}
          variant="danger"
          loading={signOut.isPending}
          onPress={() => signOut.mutate()}
        />
        {signOut.isError ? (
          <Caption style={{ color: theme.danger }}>
            {toUserMessage(signOut.error)}
          </Caption>
        ) : null}
      </View>
    </Screen>
  );
}
