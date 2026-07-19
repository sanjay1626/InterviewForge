import { View } from 'react-native';

import { Card } from './Card';
import { Body, Caption } from './Typography';
import { spacing } from './theme';

export interface SelectOption<T extends string> {
  value: T;
  label: string;
  description?: string;
}

interface OptionGroupProps<T extends string> {
  options: SelectOption<T>[];
  /** Selected value(s). Pass an array to enable multi-select. */
  selected: T | T[] | null;
  onSelect: (value: T) => void;
}

/**
 * Renders a list of selectable option cards. Array `selected` → multi-select;
 * otherwise single-select. Each card exposes an accessible selected state and a
 * 48pt+ touch target.
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
