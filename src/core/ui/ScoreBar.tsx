import { StyleSheet, View } from 'react-native';

import { Caption } from './Typography';
import { radius, spacing, useTheme } from './theme';

interface ScoreBarProps {
  label: string;
  /** 0–max */
  value: number;
  max?: number;
}

/** A labelled horizontal score meter (accessible via its value text). */
export function ScoreBar({ label, value, max = 10 }: ScoreBarProps) {
  const theme = useTheme();
  const pct = Math.max(0, Math.min(1, value / max));
  const color =
    pct >= 0.7 ? theme.success : pct >= 0.4 ? theme.warning : theme.danger;

  return (
    <View
      style={styles.row}
      accessibilityRole="text"
      accessibilityLabel={`${label}: ${value} out of ${max}`}
    >
      <View style={styles.labelCol}>
        <Caption muted={false} style={{ color: theme.text }}>
          {label}
        </Caption>
      </View>
      <View style={[styles.track, { backgroundColor: theme.surfaceAlt }]}>
        <View
          style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: color }]}
        />
      </View>
      <View style={styles.valueCol}>
        <Caption muted={false} style={{ color: theme.textMuted }}>
          {value}/{max}
        </Caption>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  labelCol: { flex: 1.6 },
  valueCol: { width: 42, alignItems: 'flex-end' },
  track: {
    flex: 2,
    height: 8,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  fill: { height: 8, borderRadius: radius.pill },
});
