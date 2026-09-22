import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Image, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { api, Profile } from '../../utils/api';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import { useTaxonomy } from '../../src/lib/taxonomy';
import { useApp } from '../../context/AppContext';
import RankBadge from '../../src/components/RankBadge';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const taxonomy = useTaxonomy();
  const { user, logout } = useApp();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const p = await api.getProfile();
      setProfile(p);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: async () => { await logout(); router.replace('/' as any); } },
    ]);
  };

  if (loading || !profile) {
    return <View style={styles.center}><ActivityIndicator color={COLORS.gold} size="large" /></View>;
  }

  const { stats } = profile;
  const isGuest = user?.is_guest;
  const ranks = taxonomy?.ranks || [];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Profile</Text>

      {/* Identity + rank */}
      <View style={styles.heroCard}>
        {user?.picture ? (
          <Image source={{ uri: user.picture }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}><Text style={styles.avatarLetter}>{(user?.name || 'W')[0].toUpperCase()}</Text></View>
        )}
        <Text style={styles.name}>{user?.name || 'Warrior'}</Text>
        <Text style={styles.email}>{isGuest ? 'Guest Warrior' : user?.email}</Text>

        <View style={{ marginTop: 16 }}>
          <RankBadge rank={stats.rank} size="lg" showTitle />
        </View>

        {/* Progress to next rank */}
        <View style={styles.progressWrap}>
          <View style={styles.progressLabels}>
            <Text style={styles.progressText}>{stats.score} pts</Text>
            <Text style={styles.progressText}>
              {stats.next_rank ? `${stats.points_to_next} pts to ${stats.next_rank.name}` : 'Max rank reached! 👑'}
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${Math.round(stats.progress * 100)}%`, backgroundColor: stats.rank.color }]} />
          </View>
        </View>
      </View>

      {/* Stats grid */}
      <View style={styles.statsGrid}>
        <StatCard label="Prompts" value={stats.prompts_uploaded} emoji="📤" />
        <StatCard label="Likes" value={stats.likes_received} emoji="❤️" />
        <StatCard label="Shares" value={stats.shares_received} emoji="↗️" />
      </View>

      {/* Rank ladder */}
      <Text style={styles.sectionTitle}>⚔️ Warrior Ranks</Text>
      <View style={styles.ladder}>
        {ranks.map((r) => {
          const reached = stats.rank.level >= r.level;
          const current = stats.rank.level === r.level;
          return (
            <View key={r.level} style={[styles.ladderRow, current && styles.ladderRowCurrent]}>
              <Text style={[styles.ladderMedal, !reached && styles.locked]}>{r.medal}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.ladderName, { color: reached ? r.color : COLORS.textMuted }]}>
                  {r.level}. {r.name}
                </Text>
                <Text style={styles.ladderTitle}>{r.title}</Text>
              </View>
              <Text style={styles.ladderScore}>{r.min_score} pts</Text>
            </View>
          );
        })}
      </View>

      {/* Actions */}
      <View style={{ paddingHorizontal: SPACING.md, marginTop: SPACING.lg, gap: 12 }}>
        {isGuest && (
          <TouchableOpacity style={styles.googleBtn} onPress={() => router.push('/sign-in' as any)}>
            <View style={styles.googleIcon}><Text style={styles.googleLetter}>G</Text></View>
            <Text style={styles.googleText}>Sign in with Google</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function StatCard({ label, value, emoji }: { label: string; value: number; emoji: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statEmoji}>{emoji}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 26, fontWeight: '900', color: COLORS.white, paddingHorizontal: SPACING.md, marginBottom: 12 },
  heroCard: {
    marginHorizontal: SPACING.md, backgroundColor: COLORS.card, borderRadius: RADIUS.xl,
    padding: SPACING.lg, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border,
  },
  avatar: { width: 68, height: 68, borderRadius: 34, borderWidth: 2, borderColor: COLORS.purpleLight },
  avatarFallback: {
    width: 68, height: 68, borderRadius: 34, backgroundColor: COLORS.purple,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarLetter: { color: COLORS.white, fontSize: 28, fontWeight: '900' },
  name: { color: COLORS.white, fontSize: 20, fontWeight: '800', marginTop: 10 },
  email: { color: COLORS.textSecondary, fontSize: 13, marginTop: 2 },
  progressWrap: { width: '100%', marginTop: 20 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressText: { color: COLORS.textSecondary, fontSize: 12.5, fontWeight: '600' },
  progressBar: { height: 10, borderRadius: 5, backgroundColor: COLORS.surface, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 5 },
  statsGrid: { flexDirection: 'row', gap: 10, paddingHorizontal: SPACING.md, marginTop: SPACING.md },
  statCard: {
    flex: 1, backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: SPACING.md,
    alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, gap: 4,
  },
  statEmoji: { fontSize: 20 },
  statValue: { color: COLORS.white, fontSize: 22, fontWeight: '900' },
  statLabel: { color: COLORS.textMuted, fontSize: 12, fontWeight: '600' },
  sectionTitle: { color: COLORS.white, fontSize: 18, fontWeight: '800', paddingHorizontal: SPACING.md, marginTop: SPACING.lg, marginBottom: SPACING.md },
  ladder: { marginHorizontal: SPACING.md, gap: 8 },
  ladderRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.card,
    borderRadius: RADIUS.md, padding: 12, borderWidth: 1, borderColor: COLORS.border,
  },
  ladderRowCurrent: { borderColor: COLORS.gold, backgroundColor: COLORS.cardAlt },
  ladderMedal: { fontSize: 26 },
  locked: { opacity: 0.3 },
  ladderName: { fontSize: 15, fontWeight: '800' },
  ladderTitle: { color: COLORS.textMuted, fontSize: 12, marginTop: 1 },
  ladderScore: { color: COLORS.textSecondary, fontSize: 12.5, fontWeight: '600' },
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12,
    backgroundColor: '#FFFFFF', paddingVertical: 15, borderRadius: RADIUS.lg,
  },
  googleIcon: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#4285F4', justifyContent: 'center', alignItems: 'center' },
  googleLetter: { color: '#FFF', fontWeight: '900', fontSize: 14 },
  googleText: { color: '#111827', fontWeight: '700', fontSize: 15.5 },
  logoutBtn: {
    paddingVertical: 15, borderRadius: RADIUS.lg, alignItems: 'center',
    borderWidth: 1.5, borderColor: COLORS.border,
  },
  logoutText: { color: COLORS.error, fontWeight: '700', fontSize: 15 },
});
