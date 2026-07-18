import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing, useTheme } from './theme';

interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  /** Center content vertically (welcome/auth screens). */
  center?: boolean;
  footer?: ReactNode;
}

export function Screen({
  children,
  scroll = true,
  center = false,
  footer,
}: ScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const body = (
    <View
      style={[
        styles.body,
        center && styles.center,
        { paddingBottom: footer ? spacing.md : insets.bottom + spacing.lg },
      ]}
    >
      {children}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: theme.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.flex, { paddingTop: insets.top }]}>
        {scroll ? (
          <ScrollView
            contentContainerStyle={[styles.scrollContent, center && styles.grow]}
            keyboardShouldPersistTaps="handled"
          >
            {body}
          </ScrollView>
        ) : (
          <View style={[styles.flex, styles.scrollContent]}>{body}</View>
        )}
        {footer ? (
          <View
            style={[
              styles.footer,
              {
                paddingBottom: insets.bottom + spacing.md,
                backgroundColor: theme.bg,
                borderTopColor: theme.border,
              },
            ]}
          >
            {footer}
          </View>
        ) : null}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  grow: { flexGrow: 1 },
  scrollContent: {
    paddingHorizontal: spacing.lg,
  },
  body: {
    flex: 1,
    gap: spacing.lg,
    paddingTop: spacing.lg,
  },
  center: {
    justifyContent: 'center',
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
});
