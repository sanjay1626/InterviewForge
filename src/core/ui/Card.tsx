import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { radius, spacing, useTheme } from './theme';

interface CardProps {
  children: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
  selected?: boolean;
}

export function Card({
  children,
  onPress,
  accessibilityLabel,
  selected = false,
}: CardProps) {
  const theme = useTheme();
  const content = <View style={styles.inner}>{children}</View>;

  const base = [
    styles.card,
    {
      backgroundColor: theme.surface,
      borderColor: selected ? theme.brand : theme.border,
      borderWidth: selected ? 2 : StyleSheet.hairlineWidth,
    },
  ];

  if (!onPress) {
    return <View style={base}>{content}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected }}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [...base, { opacity: pressed ? 0.9 : 1 }]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  inner: {
    gap: spacing.sm,
  },
});
