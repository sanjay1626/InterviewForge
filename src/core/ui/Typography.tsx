import { StyleSheet, Text, type TextProps } from 'react-native';

import { fontSize, useTheme } from './theme';

type TypoProps = TextProps & { muted?: boolean };

export function Title({ style, muted, ...rest }: TypoProps) {
  const theme = useTheme();
  return (
    <Text
      accessibilityRole="header"
      style={[styles.title, { color: muted ? theme.textMuted : theme.text }, style]}
      {...rest}
    />
  );
}

export function Subtitle({ style, muted, ...rest }: TypoProps) {
  const theme = useTheme();
  return (
    <Text
      style={[styles.subtitle, { color: muted ? theme.textMuted : theme.text }, style]}
      {...rest}
    />
  );
}

export function Body({ style, muted, ...rest }: TypoProps) {
  const theme = useTheme();
  return (
    <Text
      style={[styles.body, { color: muted ? theme.textMuted : theme.text }, style]}
      {...rest}
    />
  );
}

export function Caption({ style, muted = true, ...rest }: TypoProps) {
  const theme = useTheme();
  return (
    <Text
      style={[styles.caption, { color: muted ? theme.textMuted : theme.text }, style]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  title: { fontSize: fontSize.xxl, fontWeight: '700' },
  subtitle: { fontSize: fontSize.lg, fontWeight: '600' },
  body: { fontSize: fontSize.md, lineHeight: 22 },
  caption: { fontSize: fontSize.xs, lineHeight: 18 },
});
