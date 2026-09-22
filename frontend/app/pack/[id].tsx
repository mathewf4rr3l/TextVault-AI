import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator, Pressable, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { api, Prompt, CommunityFolderDetail } from '../../utils/api';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import { useTaxonomy, categoryEmojiMap } from '../../src/lib/taxonomy';
import PromptCard from '../../src/components/PromptCard';

export default function PackScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const taxonomy = useTaxonomy();
  const emojiMap = categoryEmojiMap(taxonomy);
  const [data, setData] = useState<CommunityFolderDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try { setData(await api.getCommunityFolder(id)); } catch {}
    finally { setLoading(false); }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const toggleFollow = async () => {
    if (!data) return;
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = !data.is_following;
    setData({ ...data, is_following: next, followers: data.followers + (next ? 1 : -1) });
    try {
      const r = await api.followFolder(id);
      setData((prev) => prev ? { ...prev, is_following: r.is_following, followers: r.followers } : prev);
    } catch { setData((prev) => prev ? { ...prev, is_following: !next, followers: prev.followers + (next ? -1 : 1) } : prev); }
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
      <Text style={{ color: COLORS.textSecondary }}>Pack not found.</Text>
      <Pressable onPress={() => router.back()}><Text style={styles.back}>← Go back</Text></Pressable>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.top, { paddingTop: insets.top + 6 }]}>
        <Pressable onPress={() => router.back()} hitSlop={10}><Ionicons name="arrow-back" size={26} color={COLORS.white} /></Pressable>
      </View>
      <FlatList
        data={data.prompts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: SPACING.md, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.packIcon}><Ionicons name="albums" size={30} color={COLORS.gold} /></View>
            <Text style={styles.name}>{data.name}</Text>
            <Pressable onPress={() => router.push(`/user/${data.owner_id}` as any)}>
              <Text style={styles.owner}>by {data.owner_name}</Text>
            </Pressable>
            <View style={styles.metaRow}>
              <Text style={styles.metaText}>{data.count} prompt{data.count !== 1 ? 's' : ''}</Text>
              <Text style={styles.dot}>·</Text>
              <Text style={styles.metaText}>{data.followers} follower{data.followers !== 1 ? 's' : ''}</Text>
            </View>
            {!data.is_mine && (
              <Pressable
                style={[styles.followBtn, data.is_following && styles.followingBtn]}
                onPress={toggleFollow}
                testID="follow-pack-btn"
              >
                <Ionicons
                  name={data.is_following ? 'checkmark' : 'add'}
                  size={18}
                  color={data.is_following ? COLORS.gold : '#2A1400'}
                />
                <Text style={[styles.followBtnText, data.is_following && styles.followingBtnText]}>
                  {data.is_following ? 'Following' : 'Follow pack'}
                </Text>
              </Pressable>
            )}
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
        ListEmptyComponent={<Text style={styles.empty}>This pack is empty.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center', gap: 12 },
  back: { color: COLORS.gold, fontWeight: '700' },
  top: { paddingHorizontal: SPACING.md, paddingBottom: 6 },
  header: { alignItems: 'center', marginBottom: SPACING.md },
  packIcon: {
    width: 64, height: 64, borderRadius: 20, backgroundColor: COLORS.goldSoft,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.gold,
  },
  name: { color: COLORS.white, fontSize: 22, fontWeight: '900', marginTop: 12, textAlign: 'center' },
  owner: { color: COLORS.gold, fontSize: 14, fontWeight: '700', marginTop: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  metaText: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '600' },
  dot: { color: COLORS.textMuted },
  followBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.gold,
    paddingHorizontal: 22, paddingVertical: 11, borderRadius: RADIUS.pill, marginTop: 16,
  },
  followingBtn: { backgroundColor: COLORS.goldSoft, borderWidth: 1, borderColor: COLORS.gold },
  followBtnText: { color: '#2A1400', fontWeight: '800', fontSize: 14.5 },
  followingBtnText: { color: COLORS.gold },
  empty: { color: COLORS.textMuted, textAlign: 'center', marginTop: 30 },
});
