import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, RADIUS } from '../../constants/theme';

const MAP: Record<string, { bg: string; fg: string }> = {
  Beginner: { bg: 'rgba(62,213,152,0.16)', fg: COLORS.success },
  Intermediate: { bg: 'rgba(245,197,66,0.16)', fg: COLORS.gold },
  Advanced: { bg: 'rgba(255,92,108,0.16)', fg: COLORS.error },
};

export default function DifficultyBadge({ level }: { level?: string }) {
  if (!level) return null;
  const c = MAP[level] || { bg: COLORS.surface, fg: COLORS.textSecondary };
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <Text style={[styles.text, { color: c.fg }]}>{level}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.pill },
  text: { fontSize: 11, fontWeight: '700' },
});
