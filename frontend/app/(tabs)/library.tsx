import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator, Pressable, TouchableOpacity, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { api, Prompt } from '../../utils/api';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import { useTaxonomy, categoryEmojiMap } from '../../src/lib/taxonomy';
import PromptCard from '../../src/components/PromptCard';

export default function Library() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const taxonomy = useTaxonomy();
  const emojiMap = categoryEmojiMap(taxonomy);
  const [tab, setTab] = useState<'uploads' | 'liked' | 'following'>('uploads');
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (which: 'uploads' | 'liked' | 'following') => {
    setLoading(true);
    try {
      const data = await api.getLibrary(which);
      setPrompts(data);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(tab); }, [tab, load]));

  const toggleLike = async (p: Prompt) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (tab === 'liked' && p.is_liked) {
      setPrompts((prev) => prev.filter((x) => x.id !== p.id));
    } else {
      setPrompts((prev) => prev.map((x) =>
        x.id === p.id ? { ...x, is_liked: !x.is_liked, likes: x.likes + (x.is_liked ? -1 : 1) } : x));
    }
    try { await api.likePrompt(p.id); } catch {}
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Library</Text>
        <TouchableOpacity style={styles.submitBtn} onPress={() => router.push('/submit' as any)}>
          <Text style={styles.submitBtnText}>+ Submit</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        {(['uploads', 'liked', 'following'] as const).map((t) => (
          <Pressable key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'uploads' ? 'My Prompts' : t === 'liked' ? 'Liked' : 'Following'}
            </Text>
          </Pressable>
        ))}
      </View>

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
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyEmoji}>{tab === 'uploads' ? '📤' : tab === 'liked' ? '🤍' : '⭐'}</Text>
              <Text style={styles.empty}>
                {tab === 'uploads'
                  ? 'You haven\u2019t submitted any prompts yet.\nShare your best prompt to climb the ranks!'
                  : tab === 'liked'
                  ? 'No liked prompts yet.\nTap the heart on prompts you love.'
                  : 'You\u2019re not following any packs yet.\nFollow a collection to see its newest prompts here.'}
              </Text>
              {tab === 'uploads' && (
                <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/submit' as any)}>
                  <Text style={styles.emptyBtnText}>Submit a Prompt</Text>
                </TouchableOpacity>
              )}
              {tab === 'following' && (
                <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/(tabs)/collections' as any)}>
                  <Text style={styles.emptyBtnText}>Browse Packs</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.md, marginBottom: 12,
  },
  title: { fontSize: 26, fontWeight: '900', color: COLORS.white },
  submitBtn: { backgroundColor: COLORS.gold, paddingHorizontal: 16, paddingVertical: 9, borderRadius: RADIUS.pill },
  submitBtnText: { color: '#2A1400', fontWeight: '800', fontSize: 14 },
  tabs: {
    flexDirection: 'row', marginHorizontal: SPACING.md, backgroundColor: COLORS.card,
    borderRadius: RADIUS.md, padding: 4, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border,
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: RADIUS.sm },
  tabActive: { backgroundColor: COLORS.purple },
  tabText: { color: COLORS.textSecondary, fontWeight: '700', fontSize: 14 },
  tabTextActive: { color: COLORS.white },
  emptyBox: { alignItems: 'center', marginTop: 60, gap: 12, paddingHorizontal: 20 },
  emptyEmoji: { fontSize: 44 },
  empty: { color: COLORS.textMuted, textAlign: 'center', fontSize: 14.5, lineHeight: 21 },
  emptyBtn: {
    marginTop: 8, backgroundColor: COLORS.purple, paddingHorizontal: 22, paddingVertical: 12,
    borderRadius: RADIUS.pill,
  },
  emptyBtnText: { color: COLORS.white, fontWeight: '800', fontSize: 14 },
});
