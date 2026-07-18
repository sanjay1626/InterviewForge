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
import {
  validateConfirmPassword,
  validateEmail,
  validatePassword,
} from '@/core/validation/validators';
import { useSignUp } from '@/features/auth/hooks/useAuthActions';

export default function RegisterScreen() {
  const theme = useTheme();
  const signUp = useSignUp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const emailError = submitted ? validateEmail(email) : null;
  const passwordError = submitted ? validatePassword(password) : null;
  const confirmError = submitted
    ? validateConfirmPassword(password, confirm)
    : null;

  const onSubmit = () => {
    setSubmitted(true);
    if (
      validateEmail(email) ||
      validatePassword(password) ||
      validateConfirmPassword(password, confirm)
    ) {
      return;
    }
    signUp.mutate({ email: email.trim(), password });
  };

  return (
    <Screen>
      <View style={{ gap: spacing.sm }}>
        <Title>Create your account</Title>
        <Body muted>
          Your resume and stories stay private to you and power personalized,
          fact-grounded coaching.
        </Body>
      </View>

      {!env.isSupabaseConfigured ? (
        <Caption style={{ color: theme.warning }}>
          Backend not configured. Add your Supabase keys to create an account, or
          use guest mode from the welcome screen.
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
        autoComplete="new-password"
        textContentType="newPassword"
        hint="At least 8 characters."
        error={passwordError}
      />
      <TextField
        label="Confirm password"
        value={confirm}
        onChangeText={setConfirm}
        secureTextEntry
        autoComplete="new-password"
        error={confirmError}
      />

      {signUp.isError ? (
        <Caption style={{ color: theme.danger }}>
          {toUserMessage(signUp.error)}
        </Caption>
      ) : null}

      <Button
        title="Create account"
        onPress={onSubmit}
        loading={signUp.isPending}
      />
    </Screen>
  );
}
