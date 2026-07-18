import { View } from 'react-native';

import { Body, Caption, Card, spacing } from '@/core/ui';
import type { Option } from '../domain/constants';

interface OptionGroupProps<T extends string> {
  options: Option<T>[];
  /** Selected value(s). Array enables multi-select. */
  selected: T | T[] | null;
  onSelect: (value: T) => void;
}

/**
 * Renders a list of selectable option cards. When `selected` is an array the
 * group behaves as multi-select; otherwise single-select. Each card exposes an
 * accessible selected state and a 48pt+ touch target.
 */
export function OptionGroup<T extends string>({
  options,
  selected,
  onSelect,
}: OptionGroupProps<T>) {
  const isSelected = (value: T): boolean =>
    Array.isArray(selected) ? selected.includes(value) : selected === value;

  return (
    <View style={{ gap: spacing.sm }}>
      {options.map((option) => (
        <Card
          key={option.value}
          selected={isSelected(option.value)}
          accessibilityLabel={option.label}
          onPress={() => onSelect(option.value)}
        >
          <Body style={{ fontWeight: '600' }}>{option.label}</Body>
          {option.description ? <Caption>{option.description}</Caption> : null}
        </Card>
      ))}
    </View>
  );
}
