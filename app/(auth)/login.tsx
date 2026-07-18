import { useState } from 'react';
import { View } from 'react-native';

import { env } from '@/core/config/env';
import { toUserMessage } from '@/core/domain/errors';
import {
  Body,
  Button,
  Caption,
  Screen,
  TextField,
  Title,
  spacing,
  useTheme,
} from '@/core/ui';
import { validateEmail, validatePassword } from '@/core/validation/validators';
import { useSignIn } from '@/features/auth/hooks/useAuthActions';

export default function LoginScreen() {
  const theme = useTheme();
  const signIn = useSignIn();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const emailError = submitted ? validateEmail(email) : null;
  const passwordError = submitted ? validatePassword(password) : null;

  const onSubmit = () => {
    setSubmitted(true);
    if (validateEmail(email) || validatePassword(password)) return;
    signIn.mutate({ email: email.trim(), password });
  };

  return (
    <Screen>
      <View style={{ gap: spacing.sm }}>
        <Title>Welcome back</Title>
        <Body muted>Sign in to continue practicing.</Body>
      </View>

      {!env.isSupabaseConfigured ? (
        <Caption style={{ color: theme.warning }}>
          Backend not configured. Add your Supabase keys to sign in, or use guest
          mode from the welcome screen.
        </Caption>
      ) : null}

      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        error={emailError}
      />
      <TextField
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
        error={passwordError}
      />

      {signIn.isError ? (
        <Caption style={{ color: theme.danger }}>
          {toUserMessage(signIn.error)}
        </Caption>
      ) : null}

      <Button title="Sign in" onPress={onSubmit} loading={signIn.isPending} />
    </Screen>
  );
}
