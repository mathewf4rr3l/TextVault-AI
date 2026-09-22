import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { COLORS } from '../../constants/theme';

interface Props {
  value: number;            // current rating (can be fractional for display)
  size?: number;
  onChange?: (stars: number) => void;  // interactive if provided
  color?: string;
}

export default function StarRating({ value, size = 18, onChange, color = COLORS.gold }: Props) {
  const stars = [1, 2, 3, 4, 5];
  return (
    <View style={styles.row}>
      {stars.map((s) => {
        const filled = value >= s;
        const half = !filled && value >= s - 0.5;
        const star = (
          <Text style={{ fontSize: size, color: filled || half ? color : COLORS.textMuted }}>
            {filled ? '★' : '☆'}
          </Text>
        );
        return onChange ? (
          <Pressable key={s} onPress={() => onChange(s)} hitSlop={6} style={styles.tap} testID={`star-${s}`}>
            {star}
          </Pressable>
        ) : (
          <View key={s}>{star}</View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 2, alignItems: 'center' },
  tap: { padding: 2 },
});
