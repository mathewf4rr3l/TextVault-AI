import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator, Pressable, Image, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { api, Prompt, PublicProfile } from '../../utils/api';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import { useTaxonomy, categoryEmojiMap } from '../../src/lib/taxonomy';
import PromptCard from '../../src/components/PromptCard';
import RankBadge from '../../src/components/RankBadge';

export default function UserProfile() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const taxonomy = useTaxonomy();
  const emojiMap = categoryEmojiMap(taxonomy);
  const [data, setData] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try { setData(await api.getPublicProfile(id)); } catch {}
      finally { setLoading(false); }
    })();
  }, [id]);

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
    <View style={styles.center}><Text style={{ color: COLORS.textSecondary }}>User not found.</Text></View>
  );

  const { user, stats } = data;
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
            {user.picture ? (
              <Image source={{ uri: user.picture }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}><Text style={styles.avatarLetter}>{(user.name || 'W')[0].toUpperCase()}</Text></View>
            )}
            <Text style={styles.name}>{user.name}{user.is_official ? '  ✓' : ''}</Text>
            <View style={{ marginTop: 10 }}><RankBadge rank={stats.rank} size="md" showTitle /></View>
            <View style={styles.statsRow}>
              <Stat label="Prompts" value={stats.prompts_uploaded} />
              <Stat label="Likes" value={stats.likes_received} />
              <Stat label="Score" value={stats.score} />
            </View>
            <Text style={styles.sectionTitle}>Prompts by {user.name}</Text>
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
        ListEmptyComponent={<Text style={styles.empty}>No prompts yet.</Text>}
      />
    </View>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' },
  top: { paddingHorizontal: SPACING.md, paddingBottom: 6 },
  header: { alignItems: 'center', marginBottom: SPACING.md },
  avatar: { width: 72, height: 72, borderRadius: 36, borderWidth: 2, borderColor: COLORS.purpleLight },
  avatarFallback: { width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.purple, justifyContent: 'center', alignItems: 'center' },
  avatarLetter: { color: COLORS.white, fontSize: 30, fontWeight: '900' },
  name: { color: COLORS.white, fontSize: 21, fontWeight: '800', marginTop: 10 },
  statsRow: { flexDirection: 'row', gap: 28, marginTop: 18 },
  stat: { alignItems: 'center' },
  statValue: { color: COLORS.white, fontSize: 20, fontWeight: '900' },
  statLabel: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  sectionTitle: { color: COLORS.white, fontSize: 16, fontWeight: '800', alignSelf: 'flex-start', marginTop: 24 },
  empty: { color: COLORS.textMuted, textAlign: 'center', marginTop: 30 },
});
