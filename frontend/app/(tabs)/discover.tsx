import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator,
  Pressable, TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { api, Prompt } from '../../utils/api';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import { useTaxonomy, categoryEmojiMap } from '../../src/lib/taxonomy';
import PromptCard from '../../src/components/PromptCard';

type DiscoverData = {
  trending: Prompt[];
  newest: Prompt[];
  top: Prompt[];
  categories: { name: string; emoji: string; count: number }[];
};

export default function Discover() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const taxonomy = useTaxonomy();
  const emojiMap = categoryEmojiMap(taxonomy);
  const [data, setData] = useState<DiscoverData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await api.discover();
      setData(d);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const toggleLike = async (p: Prompt) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const update = (list: Prompt[]) => list.map((x) =>
      x.id === p.id ? { ...x, is_liked: !x.is_liked, likes: x.likes + (x.is_liked ? -1 : 1) } : x);
    setData((prev) => prev ? {
      ...prev,
      trending: update(prev.trending),
      newest: update(prev.newest),
      top: update(prev.top),
    } : prev);
    try { await api.likePrompt(p.id); } catch {}
  };

  if (loading) {
    return (
      <View style={styles.center}><ActivityIndicator color={COLORS.gold} size="large" /></View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120, paddingTop: insets.top + 8 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.gold} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>PromptVeer</Text>
            <Text style={styles.sub}>Discover battle-tested AI prompts</Text>
          </View>
          <TouchableOpacity style={styles.submitBtn} onPress={() => router.push('/submit' as any)} testID="submit-nav-btn">
            <Text style={styles.submitBtnText}>+ Submit</Text>
          </TouchableOpacity>
        </View>

        {/* Trending */}
        <SectionHeader title="🔥 Trending Now" onSeeAll={() => router.push('/(tabs)/browse' as any)} />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: SPACING.md, gap: 12 }}
        >
          {(data?.trending || []).map((p) => (
            <View key={p.id} style={{ width: 290 }}>
              <PromptCard
                prompt={p}
                categoryEmoji={emojiMap[p.category]}
                onPress={() => router.push(`/prompt/${p.id}` as any)}
                onToggleLike={() => toggleLike(p)}
              />
            </View>
          ))}
        </ScrollView>

        {/* Categories */}
        <SectionHeader title="🗂️ Explore Categories" onSeeAll={() => router.push('/(tabs)/browse' as any)} />
        <View style={styles.catGrid}>
          {(data?.categories || []).slice(0, 12).map((c) => (
            <Pressable
              key={c.name}
              style={styles.catCard}
              onPress={() => router.push({ pathname: '/(tabs)/browse', params: { category: c.name } } as any)}
            >
              <View style={styles.catInner}>
                <Text style={styles.catEmoji}>{c.emoji}</Text>
                <Text style={styles.catName} numberOfLines={2}>{c.name}</Text>
                <Text style={styles.catCount}>{c.count} prompts</Text>
              </View>
            </Pressable>
          ))}
        </View>

        {/* Newest */}
        <SectionHeader title="🆕 Fresh Drops" onSeeAll={() => router.push({ pathname: '/(tabs)/browse', params: { sort: 'newest' } } as any)} />
        <View style={{ paddingHorizontal: SPACING.md }}>
          {(data?.newest || []).slice(0, 6).map((p) => (
            <PromptCard
              key={p.id}
              prompt={p}
              categoryEmoji={emojiMap[p.category]}
              onPress={() => router.push(`/prompt/${p.id}` as any)}
              onToggleLike={() => toggleLike(p)}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function SectionHeader({ title, onSeeAll }: { title: string; onSeeAll?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {onSeeAll && (
        <TouchableOpacity onPress={onSeeAll}><Text style={styles.seeAll}>See all →</Text></TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.md, marginBottom: SPACING.lg,
  },
  brand: { fontSize: 28, fontWeight: '900', color: COLORS.white, letterSpacing: -0.5 },
  sub: { fontSize: 13.5, color: COLORS.purpleLight, marginTop: 2 },
  submitBtn: {
    backgroundColor: COLORS.gold, paddingHorizontal: 16, paddingVertical: 10, borderRadius: RADIUS.pill,
  },
  submitBtnText: { color: '#2A1400', fontWeight: '800', fontSize: 14 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.md, marginTop: SPACING.sm, marginBottom: SPACING.md,
  },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: COLORS.white },
  seeAll: { color: COLORS.gold, fontWeight: '700', fontSize: 13 },
  catGrid: {
    flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: SPACING.md - 4, gap: 0,
  },
  catCard: {
    width: '33.33%', padding: 6,
  },
  catInner: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    minHeight: 104,
  },
  catEmoji: { fontSize: 26 },
  catName: { color: COLORS.white, fontSize: 12.5, fontWeight: '700', marginTop: 6 },
  catCount: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
});
