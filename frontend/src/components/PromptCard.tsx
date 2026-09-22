import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Prompt, formatCount } from '../../utils/api';
import { COLORS, RADIUS, SPACING } from '../../constants/theme';
import DifficultyBadge from './DifficultyBadge';

interface Props {
  prompt: Prompt;
  onPress: () => void;
  onToggleLike?: () => void;
  categoryEmoji?: string;
}

const TYPE_EMOJI: Record<string, string> = {
  Image: '🎨', Video: '🎬', Audio: '🎧', Code: '💻', Text: '📝',
};

export default function PromptCard({ prompt, onPress, onToggleLike, categoryEmoji }: Props) {
  return (
    <Pressable style={styles.card} onPress={onPress} testID={`prompt-card-${prompt.id}`}>
      <View style={styles.topRow}>
        <View style={styles.catBadge}>
          <Text style={styles.catText} numberOfLines={1}>
            {categoryEmoji ? `${categoryEmoji} ` : ''}{prompt.category}
          </Text>
        </View>
        {prompt.tool ? (
          <View style={styles.toolBadge}>
            <Text style={styles.toolText} numberOfLines={1}>{prompt.tool}</Text>
          </View>
        ) : null}
      </View>

      <Text style={styles.title} numberOfLines={2}>{prompt.title}</Text>
      <Text style={styles.preview} numberOfLines={3}>{prompt.content}</Text>

      <View style={styles.metaRow}>
        <View style={styles.metaLeft}>
          <DifficultyBadge level={prompt.difficulty} />
          {prompt.content_type ? (
            <Text style={styles.typeText}>{TYPE_EMOJI[prompt.content_type] || '📝'} {prompt.content_type}</Text>
          ) : null}
        </View>
        <View style={styles.stats}>
          <Pressable
            style={styles.likeBtn}
            onPress={(e) => { e.stopPropagation?.(); onToggleLike?.(); }}
            hitSlop={8}
            testID={`like-btn-${prompt.id}`}
          >
            <Text style={[styles.heart, prompt.is_liked && styles.heartActive]}>
              {prompt.is_liked ? '❤️' : '🤍'}
            </Text>
            <Text style={styles.statText}>{formatCount(prompt.likes)}</Text>
          </Pressable>
          <Text style={styles.statText}>↗ {formatCount(prompt.shares)}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
    gap: 8,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  catBadge: {
    backgroundColor: COLORS.purpleGlow,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
    maxWidth: '70%',
  },
  catText: { color: COLORS.purpleLight, fontSize: 12, fontWeight: '700' },
  toolBadge: {
    backgroundColor: COLORS.goldSoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
  },
  toolText: { color: COLORS.gold, fontSize: 12, fontWeight: '700' },
  title: { color: COLORS.white, fontSize: 16.5, fontWeight: '800', lineHeight: 22 },
  preview: { color: COLORS.textSecondary, fontSize: 13.5, lineHeight: 19 },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  metaLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  typeText: { color: COLORS.textMuted, fontSize: 12, fontWeight: '600' },
  stats: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  likeBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  heart: { fontSize: 15 },
  heartActive: {},
  statText: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '600' },
});
