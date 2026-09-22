import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator, Pressable, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { api, LeaderboardEntry } from '../utils/api';
import { COLORS, SPACING, RADIUS } from '../constants/theme';

const PODIUM = ['🥇', '🥈', '🥉'];

export default function Leaderboard() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try { setEntries(await api.getLeaderboard()); } catch {}
      finally { setLoading(false); }
    })();
  }, []);

  return (
    <View style={styles.container}>
      <View style={[styles.top, { paddingTop: insets.top + 6 }]}>
        <Pressable onPress={() => router.back()} hitSlop={10}><Text style={styles.back}>←</Text></Pressable>
        <Text style={styles.title}>🏆 Leaderboard</Text>
        <View style={{ width: 28 }} />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={COLORS.gold} size="large" /></View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.user_id}
          contentContainerStyle={{ padding: SPACING.md, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => (
            <View style={[styles.row, index < 3 && styles.rowTop]}>
              <Text style={styles.pos}>{index < 3 ? PODIUM[index] : `#${index + 1}`}</Text>
              {item.picture ? (
                <Image source={{ uri: item.picture }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatarFallback, { backgroundColor: item.rank.color }]}>
                  <Text style={styles.avatarMedal}>{item.rank.medal}</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                <Text style={[styles.rankName, { color: item.rank.color }]}>
                  {item.rank.medal} {item.rank.name} · {item.prompts_uploaded} prompts
                </Text>
              </View>
              <View style={styles.scoreBox}>
                <Text style={styles.score}>{item.score}</Text>
                <Text style={styles.scoreLabel}>pts</Text>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>⚔️</Text>
              <Text style={styles.emptyText}>No warriors ranked yet.{'\n'}Submit prompts and earn likes to be the first!</Text>
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
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.md, paddingBottom: 12 },
  back: { color: COLORS.white, fontSize: 28, fontWeight: '700' },
  title: { color: COLORS.white, fontSize: 20, fontWeight: '900' },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border,
  },
  rowTop: { borderColor: COLORS.gold, backgroundColor: COLORS.cardAlt },
  pos: { color: COLORS.white, fontSize: 18, fontWeight: '900', width: 34, textAlign: 'center' },
  avatar: { width: 42, height: 42, borderRadius: 21 },
  avatarFallback: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
  avatarMedal: { fontSize: 20 },
  name: { color: COLORS.white, fontSize: 15.5, fontWeight: '800' },
  rankName: { fontSize: 12.5, fontWeight: '600', marginTop: 2 },
  scoreBox: { alignItems: 'flex-end' },
  score: { color: COLORS.gold, fontSize: 18, fontWeight: '900' },
  scoreLabel: { color: COLORS.textMuted, fontSize: 11 },
  empty: { alignItems: 'center', marginTop: 60, gap: 12 },
  emptyEmoji: { fontSize: 44 },
  emptyText: { color: COLORS.textMuted, textAlign: 'center', fontSize: 14.5, lineHeight: 21 },
});
