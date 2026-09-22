import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator, Pressable, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { api, CollectionPreview } from '../../utils/api';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';

export default function Collections() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [collections, setCollections] = useState<CollectionPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { setCollections(await api.getCollections()); } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

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
                <View style={[styles.countPill, { backgroundColor: item.color }]}>
                  <Text style={styles.countText}>{item.count} prompts</Text>
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
  countPill: { alignSelf: 'flex-start', marginTop: 8, paddingHorizontal: 10, paddingVertical: 3, borderRadius: RADIUS.pill },
  countText: { color: '#1A0E2E', fontSize: 11, fontWeight: '800' },
  chevron: { color: COLORS.textMuted, fontSize: 28, fontWeight: '300' },
});
