import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, ScrollView, ActivityIndicator, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { api, Prompt, PromptFilters } from '../../utils/api';
import { COLORS, SPACING } from '../../constants/theme';
import { useTaxonomy, categoryEmojiMap } from '../../src/lib/taxonomy';
import PromptCard from '../../src/components/PromptCard';
import Chip from '../../src/components/Chip';

const SORTS: { key: PromptFilters['sort']; label: string }[] = [
  { key: 'trending', label: '🔥 Trending' },
  { key: 'newest', label: '🆕 Newest' },
  { key: 'top', label: '⭐ Most Liked' },
  { key: 'top_rated', label: '🌟 Top Rated' },
];

export default function Browse() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ category?: string; sort?: string }>();
  const taxonomy = useTaxonomy();
  const emojiMap = categoryEmojiMap(taxonomy);

  const [category, setCategory] = useState<string>(params.category || 'All');
  const [sort, setSort] = useState<PromptFilters['sort']>((params.sort as any) || 'trending');
  const [difficulty, setDifficulty] = useState<string>('');
  const [tool, setTool] = useState<string>('');
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.category) setCategory(params.category);
    if (params.sort) setSort(params.sort as any);
  }, [params.category, params.sort]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.listPrompts({
        category: category === 'All' ? undefined : category,
        difficulty: difficulty || undefined,
        tool: tool || undefined,
        sort,
        limit: 50,
      });
      setPrompts(data);
    } catch {}
    finally { setLoading(false); }
  }, [category, difficulty, tool, sort]);

  useEffect(() => { load(); }, [load]);

  const toggleLike = async (p: Prompt) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPrompts((prev) => prev.map((x) =>
      x.id === p.id ? { ...x, is_liked: !x.is_liked, likes: x.likes + (x.is_liked ? -1 : 1) } : x));
    try { await api.likePrompt(p.id); } catch {}
  };

  const categories = ['All', ...(taxonomy?.categories.map((c) => c.name) || [])];
  const tools = taxonomy?.tools || [];

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <Text style={styles.title}>Browse</Text>

      {/* Category chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}
        contentContainerStyle={styles.chipRowContent}>
        {categories.map((c) => (
          <Chip key={c} label={c} emoji={c !== 'All' ? emojiMap[c] : undefined}
            active={category === c} onPress={() => setCategory(c)} />
        ))}
      </ScrollView>

      {/* Sort chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRowSm}
        contentContainerStyle={styles.chipRowContent}>
        {SORTS.map((s) => (
          <Chip key={s.key} label={s.label} active={sort === s.key} onPress={() => setSort(s.key)} />
        ))}
        {taxonomy?.difficulties.map((d) => (
          <Chip key={d} label={d} active={difficulty === d}
            onPress={() => setDifficulty(difficulty === d ? '' : d)} />
        ))}
      </ScrollView>

      {/* Tool chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRowSm}
        contentContainerStyle={styles.chipRowContent}>
        {tools.map((t) => (
          <Chip key={t} label={t} active={tool === t}
            onPress={() => setTool(tool === t ? '' : t)} />
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={COLORS.gold} size="large" /></View>
      ) : (
        <FlatList
          data={prompts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: SPACING.md, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <PromptCard
              prompt={item}
              categoryEmoji={emojiMap[item.category]}
              onPress={() => router.push(`/prompt/${item.id}` as any)}
              onToggleLike={() => toggleLike(item)}
            />
          )}
          ListEmptyComponent={<Text style={styles.empty}>No prompts match these filters yet.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 26, fontWeight: '900', color: COLORS.white, paddingHorizontal: SPACING.md, marginBottom: 12 },
  chipRow: { maxHeight: 48, marginBottom: 8 },
  chipRowSm: { maxHeight: 44, marginBottom: 8 },
  chipRowContent: { paddingHorizontal: SPACING.md, gap: 8, alignItems: 'center' },
  empty: { color: COLORS.textMuted, textAlign: 'center', marginTop: 40, fontSize: 15 },
});
