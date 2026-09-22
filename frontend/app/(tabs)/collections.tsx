import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator, Pressable, RefreshControl, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api, CollectionPreview, CommunityFolder } from '../../utils/api';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';

export default function Collections() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [collections, setCollections] = useState<CollectionPreview[]>([]);
  const [community, setCommunity] = useState<CommunityFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [c, cf] = await Promise.all([api.getCollections(), api.getCommunityFolders()]);
      setCollections(c);
      setCommunity(cf);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const toggleFollow = async (f: CommunityFolder) => {
    setCommunity((prev) => prev.map((x) =>
      x.id === f.id ? { ...x, is_following: !x.is_following, followers: x.followers + (x.is_following ? -1 : 1) } : x));
    try { await api.followFolder(f.id); } catch {}
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <Text style={styles.title}>⭐ Collections</Text>
      <Text style={styles.subtitle}>Curated prompt packs, ready to use</Text>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={COLORS.gold} size="large" /></View>
      ) : (
        <FlatList
          data={collections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: SPACING.md, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.gold} />}
          ListHeaderComponent={community.length > 0 ? (
            <View style={styles.communitySection}>
              <View style={styles.sectionHead}>
                <Ionicons name="people" size={18} color={COLORS.gold} />
                <Text style={styles.sectionTitle}>Community Packs</Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 12, paddingBottom: 4 }}
                testID="community-packs-row"
              >
                {community.map((f) => (
                  <Pressable
                    key={f.id}
                    style={styles.commCard}
                    onPress={() => router.push(`/pack/${f.id}` as any)}
                    testID={`community-pack-${f.id}`}
                  >
                    <Text style={styles.commEmoji}>{f.emoji}</Text>
                    <Text style={styles.commName} numberOfLines={2}>{f.name}</Text>
                    <Text style={styles.commOwner} numberOfLines={1}>by {f.owner_name}</Text>
                    <Text style={styles.commMeta}>{f.count} prompts · {f.followers} ★</Text>
                    {f.is_mine ? (
                      <View style={styles.mineTag}><Text style={styles.mineTagText}>Yours</Text></View>
                    ) : (
                      <Pressable
                        style={[styles.commFollow, f.is_following && styles.commFollowing]}
                        onPress={() => toggleFollow(f)}
                        testID={`community-follow-${f.id}`}
                      >
                        <Text style={[styles.commFollowText, f.is_following && styles.commFollowingText]}>
                          {f.is_following ? '✓ Following' : '+ Follow'}
                        </Text>
                      </Pressable>
                    )}
                  </Pressable>
                ))}
              </ScrollView>
              <Text style={styles.curatedHeading}>Curated Collections</Text>
            </View>
          ) : null}
          renderItem={({ item }) => (
            <Pressable
              style={[styles.card, { borderColor: item.color, backgroundColor: `${item.color}1A` }]}
              onPress={() => router.push(`/collection/${item.id}` as any)}
              testID={`collection-${item.id}`}
            >
              <View style={[styles.iconBox, { backgroundColor: `${item.color}33` }]}>
                <Text style={styles.emoji}>{item.emoji}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardSub} numberOfLines={1}>{item.subtitle}</Text>
                <View style={styles.cardMetaRow}>
                  <View style={[styles.countPill, { backgroundColor: item.color }]}>
                    <Text style={styles.countText}>{item.count} prompts</Text>
                  </View>
                  {item.is_following && <Text style={styles.followingTag}>★ Following</Text>}
                </View>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 26, fontWeight: '900', color: COLORS.white, paddingHorizontal: SPACING.md },
  subtitle: { color: COLORS.textSecondary, fontSize: 14, paddingHorizontal: SPACING.md, marginTop: 2, marginBottom: 12 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: RADIUS.lg, borderWidth: 1,
    padding: SPACING.md, marginBottom: 12,
  },
  iconBox: { width: 54, height: 54, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  emoji: { fontSize: 28 },
  cardTitle: { color: COLORS.white, fontSize: 16.5, fontWeight: '800' },
  cardSub: { color: COLORS.textSecondary, fontSize: 13, marginTop: 2 },
  countPill: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: RADIUS.pill },
  countText: { color: '#1A0E2E', fontSize: 11, fontWeight: '800' },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  followingTag: { color: COLORS.gold, fontSize: 11.5, fontWeight: '800' },
  chevron: { color: COLORS.textMuted, fontSize: 28, fontWeight: '300' },
  communitySection: { marginBottom: 4 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 12 },
  sectionTitle: { color: COLORS.white, fontSize: 17, fontWeight: '800' },
  commCard: {
    width: 150, backgroundColor: COLORS.card, borderRadius: RADIUS.lg, borderWidth: 1,
    borderColor: COLORS.border, padding: 14, gap: 4,
  },
  commEmoji: { fontSize: 26 },
  commName: { color: COLORS.white, fontSize: 14.5, fontWeight: '800', marginTop: 2 },
  commOwner: { color: COLORS.gold, fontSize: 11.5, fontWeight: '700' },
  commMeta: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  commFollow: {
    marginTop: 8, backgroundColor: COLORS.gold, borderRadius: RADIUS.pill, paddingVertical: 7, alignItems: 'center',
  },
  commFollowing: { backgroundColor: COLORS.goldSoft, borderWidth: 1, borderColor: COLORS.gold },
  commFollowText: { color: '#2A1400', fontWeight: '800', fontSize: 12.5 },
  commFollowingText: { color: COLORS.gold },
  mineTag: {
    marginTop: 8, backgroundColor: COLORS.purpleGlow, borderRadius: RADIUS.pill, paddingVertical: 7, alignItems: 'center',
  },
  mineTagText: { color: COLORS.purpleLight, fontWeight: '800', fontSize: 12.5 },
  curatedHeading: { color: COLORS.white, fontSize: 17, fontWeight: '800', marginTop: 22, marginBottom: 4 },
});
