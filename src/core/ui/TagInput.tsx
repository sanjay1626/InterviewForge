import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Body, Caption } from './Typography';
import { fontSize, radius, spacing, useTheme } from './theme';

interface TagInputProps {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  hint?: string;
}

/**
 * Chip-based list editor for free-text tags (skills, accomplishments). Add on
 * submit/return; remove by tapping a chip. Each chip and the field expose
 * accessible labels.
 */
export function TagInput({
  label,
  values,
  onChange,
  placeholder,
  hint,
}: TagInputProps) {
  const theme = useTheme();
  const [draft, setDraft] = useState('');

  const add = () => {
    const value = draft.trim();
    if (!value) return;
    if (!values.includes(value)) onChange([...values, value]);
    setDraft('');
  };

  const remove = (value: string) => onChange(values.filter((v) => v !== value));

  return (
    <View style={styles.container}>
      <Body style={[styles.label, { color: theme.textMuted }]}>{label}</Body>
      {values.length > 0 ? (
        <View style={styles.chips}>
          {values.map((value) => (
            <Pressable
              key={value}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${value}`}
              onPress={() => remove(value)}
              hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
              style={[
                styles.chip,
                { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
              ]}
            >
              <Caption muted={false} style={{ color: theme.text }}>
                {value}  ✕
              </Caption>
            </Pressable>
          ))}
        </View>
      ) : null}
      <TextInput
        accessibilityLabel={`Add ${label}`}
        value={draft}
        onChangeText={setDraft}
        onSubmitEditing={add}
        onBlur={add}
        blurOnSubmit={false}
        returnKeyType="done"
        placeholder={placeholder ?? 'Type and press return to add'}
        placeholderTextColor={theme.textMuted}
        style={[
          styles.input,
          { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border },
        ]}
      />
      {hint ? <Caption>{hint}</Caption> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs, width: '100%' },
  label: { fontSize: fontSize.sm, fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  input: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.md,
  },
});
