import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, FlatList, ActivityIndicator, Pressable, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { api, Prompt } from '../../utils/api';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import { useTaxonomy, categoryEmojiMap } from '../../src/lib/taxonomy';
import PromptCard from '../../src/components/PromptCard';

const EXAMPLES = ['Midjourney', 'ChatGPT', 'Resume', 'Marketing', 'Coding', 'Sora', 'SEO', 'Startup'];

export default function Search() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const taxonomy = useTaxonomy();
  const emojiMap = categoryEmojiMap(taxonomy);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = async (q: string) => {
    if (!q.trim()) { setResults([]); setSearched(false); return; }
    setLoading(true);
    setSearched(true);
    try {
      const data = await api.listPrompts({ q: q.trim(), sort: 'top', limit: 50 });
      setResults(data);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => runSearch(query), 350);
    return () => { if (debounce.current) clearTimeout(debounce.current); };
  }, [query]);

  const toggleLike = async (p: Prompt) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setResults((prev) => prev.map((x) =>
      x.id === p.id ? { ...x, is_liked: !x.is_liked, likes: x.likes + (x.is_liked ? -1 : 1) } : x));
    try { await api.likePrompt(p.id); } catch {}
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <Text style={styles.title}>Search</Text>
      <View style={styles.searchBox}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.input}
          placeholder="Search prompts, tools, topics…"
          placeholderTextColor={COLORS.textMuted}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          returnKeyType="search"
          testID="search-input"
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery('')} hitSlop={8}>
            <Text style={styles.clear}>✕</Text>
          </Pressable>
        )}
      </View>

      {!searched && (
        <View style={styles.examples}>
          <Text style={styles.examplesLabel}>Try searching for</Text>
          <View style={styles.exampleChips}>
            {EXAMPLES.map((e) => (
              <Pressable key={e} style={styles.exampleChip} onPress={() => setQuery(e)}>
                <Text style={styles.exampleText}>{e}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={COLORS.gold} size="large" /></View>
      ) : searched ? (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: SPACING.md, paddingBottom: 120 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <PromptCard
              prompt={item}
              categoryEmoji={emojiMap[item.category]}
              onPress={() => router.push(`/prompt/${item.id}` as any)}
              onToggleLike={() => toggleLike(item)}
            />
          )}
          ListHeaderComponent={<Text style={styles.resultCount}>{results.length} result{results.length !== 1 ? 's' : ''}</Text>}
          ListEmptyComponent={<Text style={styles.empty}>No prompts found. Try a different keyword.</Text>}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 26, fontWeight: '900', color: COLORS.white, paddingHorizontal: SPACING.md, marginBottom: 12 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: SPACING.md, backgroundColor: COLORS.card,
    borderRadius: RADIUS.md, paddingHorizontal: 14, height: 50,
    borderWidth: 1, borderColor: COLORS.border,
  },
  searchIcon: { fontSize: 16 },
  input: { flex: 1, color: COLORS.white, fontSize: 15.5 },
  clear: { color: COLORS.textMuted, fontSize: 16, fontWeight: '700' },
  examples: { padding: SPACING.md },
  examplesLabel: { color: COLORS.textSecondary, fontSize: 14, marginBottom: 12, fontWeight: '600' },
  exampleChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  exampleChip: {
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: RADIUS.pill,
  },
  exampleText: { color: COLORS.purpleLight, fontWeight: '600', fontSize: 13.5 },
  resultCount: { color: COLORS.textMuted, fontSize: 13, marginBottom: 12, fontWeight: '600' },
  empty: { color: COLORS.textMuted, textAlign: 'center', marginTop: 40, fontSize: 15 },
});
