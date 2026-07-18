import { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native';

import { fontSize, radius, spacing, useTheme } from './theme';

interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string | null;
  hint?: string;
}

export function TextField({
  label,
  error,
  hint,
  style,
  ...rest
}: TextFieldProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: theme.textMuted }]}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={theme.textMuted}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[
          styles.input,
          {
            backgroundColor: theme.surface,
            color: theme.text,
            borderColor: error
              ? theme.danger
              : focused
                ? theme.brand
                : theme.border,
          },
          style,
        ]}
        {...rest}
      />
      {error ? (
        <Text style={[styles.helper, { color: theme.danger }]}>{error}</Text>
      ) : hint ? (
        <Text style={[styles.helper, { color: theme.textMuted }]}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
    width: '100%',
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  input: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.md,
  },
  helper: {
    fontSize: fontSize.xs,
  },
});
