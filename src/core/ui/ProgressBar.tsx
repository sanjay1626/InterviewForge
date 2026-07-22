import { StyleSheet, View } from 'react-native';

import { Caption } from './Typography';
import { radius, spacing, useTheme } from './theme';

interface ProgressBarProps {
  /** 0–1 */
  progress: number;
  label?: string;
  /** Renders in the danger colour and stops implying forward motion. */
  failed?: boolean;
}

/** Determinate progress bar with a stage label and percentage. */
export function ProgressBar({ progress, label, failed = false }: ProgressBarProps) {
  const theme = useTheme();
  const pct = Math.max(0, Math.min(1, progress));
  const done = pct >= 1 && !failed;
  const color = failed ? theme.danger : done ? theme.success : theme.brand;

  return (
    <View
      style={styles.container}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct * 100) }}
      accessibilityLabel={label}
    >
      {label ? (
        <View style={styles.labelRow}>
          <Caption muted={false} style={{ color: theme.text, flex: 1 }}>
            {label}
          </Caption>
          <Caption muted={false} style={{ color }}>
            {failed ? 'Failed' : `${Math.round(pct * 100)}%`}
          </Caption>
        </View>
      ) : null}
      <View style={[styles.track, { backgroundColor: theme.surfaceAlt }]}>
        <View
          style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: color }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs, width: '100%' },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  track: { height: 8, borderRadius: radius.pill, overflow: 'hidden' },
  fill: { height: 8, borderRadius: radius.pill },
});
