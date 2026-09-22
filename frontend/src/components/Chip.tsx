import React from 'react';
import { Text, StyleSheet, Pressable } from 'react-native';
import { COLORS, RADIUS } from '../../constants/theme';

interface ChipProps {
  label: string;
  active?: boolean;
  onPress?: () => void;
  emoji?: string;
}

export default function Chip({ label, active, onPress, emoji }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
      hitSlop={4}
    >
      <Text style={[styles.text, active && styles.textActive]} numberOfLines={1}>
        {emoji ? `${emoji} ` : ''}{label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: {
    backgroundColor: COLORS.purple,
    borderColor: COLORS.purpleLight,
  },
  text: { color: COLORS.textSecondary, fontSize: 13.5, fontWeight: '600', maxWidth: 220 },
  textActive: { color: COLORS.white },
});
