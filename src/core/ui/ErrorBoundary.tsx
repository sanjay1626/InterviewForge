import { Component, type ErrorInfo, type ReactNode } from 'react';
import { SafeAreaView, StyleSheet, View } from 'react-native';

import { Button } from './Button';
import { Body, Title } from './Typography';
import { spacing } from './theme';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * App-level error boundary. Catches render-time exceptions so a single broken
 * screen never takes down the whole app, and offers a reset. Uses static colors
 * because hooks are unavailable in a class component.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error('Unhandled UI error', error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.content}>
            <Title>Unexpected error</Title>
            <Body muted style={styles.text}>
              The app hit a problem while rendering this screen. You can try
              again — your data is safe.
            </Body>
            <Button title="Reload screen" onPress={this.reset} fullWidth={false} />
          </View>
        </SafeAreaView>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center' },
  content: {
    padding: spacing.xl,
    gap: spacing.lg,
    alignItems: 'flex-start',
  },
  text: { lineHeight: 22 },
});
