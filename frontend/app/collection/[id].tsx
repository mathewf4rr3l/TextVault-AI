import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator, Pressable, Platform, TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { api, CollectionDetail, Prompt } from '../../utils/api';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import { useTaxonomy, categoryEmojiMap } from '../../src/lib/taxonomy';
import PromptCard from '../../src/components/PromptCard';

export default function CollectionScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const taxonomy = useTaxonomy();
  const emojiMap = categoryEmojiMap(taxonomy);
  const [data, setData] = useState<CollectionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const c = await api.getCollection(id);
        setData(c);
        setFollowing(!!c.is_following);
      } catch {}
      finally { setLoading(false); }
    })();
  }, [id]);

  const toggleFollow = async () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setFollowing((f) => !f);
    try { const r = await api.followCollection(id); setFollowing(r.is_following); } catch {}
  };

  const toggleLike = async (p: Prompt) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setData((prev) => prev ? {
      ...prev,
      prompts: prev.prompts.map((x) => x.id === p.id ? { ...x, is_liked: !x.is_liked, likes: x.likes + (x.is_liked ? -1 : 1) } : x),
    } : prev);
    try { await api.likePrompt(p.id); } catch {}
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color={COLORS.gold} size="large" /></View>;
  if (!data) return (
    <View style={styles.center}>
      <Text style={{ color: COLORS.textSecondary }}>Collection not found.</Text>
      <Pressable onPress={() => router.back()}><Text style={styles.back}>← Go back</Text></Pressable>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.top, { paddingTop: insets.top + 6 }]}>
        <Pressable onPress={() => router.back()} hitSlop={10}><Text style={styles.backIcon}>←</Text></Pressable>
      </View>
      <FlatList
        data={data.prompts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: SPACING.md, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={[styles.hero, { backgroundColor: `${data.color}22`, borderColor: data.color }]}>
            <Text style={styles.heroEmoji}>{data.emoji}</Text>
            <Text style={styles.heroTitle}>{data.title}</Text>
            <Text style={styles.heroSub}>{data.subtitle} · {data.count} prompts</Text>
            <TouchableOpacity
              style={[styles.followBtn, following ? { backgroundColor: data.color } : { borderColor: data.color, borderWidth: 1.5 }]}
              onPress={toggleFollow}
              testID="follow-btn"
            >
              <Text style={[styles.followText, following && { color: '#150A24' }]}>
                {following ? '✓ Following' : '+ Follow pack'}
              </Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <PromptCard
            prompt={item}
            categoryEmoji={emojiMap[item.category]}
            onPress={() => router.push(`/prompt/${item.id}` as any)}
            onToggleLike={() => toggleLike(item)}
          />
        )}
        ListEmptyComponent={<Text style={styles.empty}>No prompts in this collection yet.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center', gap: 12 },
  back: { color: COLORS.gold, marginTop: 12, fontWeight: '700' },
  top: { paddingHorizontal: SPACING.md, paddingBottom: 4 },
  backIcon: { color: COLORS.white, fontSize: 28, fontWeight: '700' },
  hero: {
    borderRadius: 20, borderWidth: 1, padding: SPACING.lg, alignItems: 'center', marginBottom: SPACING.md,
  },
  heroEmoji: { fontSize: 44 },
  heroTitle: { color: COLORS.white, fontSize: 24, fontWeight: '900', marginTop: 8 },
  heroSub: { color: COLORS.textSecondary, fontSize: 13.5, marginTop: 4 },
  followBtn: { marginTop: 14, paddingHorizontal: 22, paddingVertical: 10, borderRadius: RADIUS.pill },
  followText: { color: COLORS.white, fontWeight: '800', fontSize: 14 },
  empty: { color: COLORS.textMuted, textAlign: 'center', marginTop: 40, fontSize: 15 },
});
