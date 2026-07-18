import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button } from './Button';
import { Body, Subtitle } from './Typography';
import { spacing, useTheme } from './theme';

/** Full-height centered spinner for loading states. */
export function LoadingView({ label }: { label?: string }) {
  const theme = useTheme();
  return (
    <View style={styles.center} accessibilityRole="progressbar">
      <ActivityIndicator size="large" color={theme.brand} />
      {label ? (
        <Body muted style={styles.text}>
          {label}
        </Body>
      ) : null}
    </View>
  );
}

/** Empty state with an optional call to action. */
export function EmptyView({
  title,
  message,
  actionLabel,
  onAction,
}: {
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.center}>
      <Subtitle style={styles.text}>{title}</Subtitle>
      {message ? (
        <Body muted style={styles.text}>
          {message}
        </Body>
      ) : null}
      {actionLabel && onAction ? (
        <View style={styles.action}>
          <Button title={actionLabel} onPress={onAction} fullWidth={false} />
        </View>
      ) : null}
    </View>
  );
}

/** Error state with a retry affordance for retryable failures. */
export function ErrorView({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.center}>
      <Subtitle style={[styles.text, { color: theme.danger }]}>
        Something went wrong
      </Subtitle>
      <Body muted style={styles.text}>
        {message}
      </Body>
      {onRetry ? (
        <View style={styles.action}>
          <Button
            title="Try again"
            variant="secondary"
            onPress={onRetry}
            fullWidth={false}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
  },
  text: {
    textAlign: 'center',
  },
  action: {
    marginTop: spacing.md,
  },
});
