import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Pressable,
  Share, Platform, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { api, Prompt, formatCount, timeAgo } from '../../utils/api';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import { useApp } from '../../context/AppContext';
import DifficultyBadge from '../../src/components/DifficultyBadge';

export default function PromptDetail() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useApp();
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [streakMsg, setStreakMsg] = useState('');

  useEffect(() => {
    (async () => {
      try { setPrompt(await api.getPrompt(id)); } catch {}
      finally { setLoading(false); }
    })();
  }, [id]);

  const onCopy = async () => {
    if (!prompt) return;
    await Clipboard.setStringAsync(prompt.content);
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
    try {
      const r = await api.copyPrompt(prompt.id);
      if (r.points_awarded > 0) {
        setStreakMsg(`${r.badge.emoji} ${r.streak}-day streak! +${r.points_awarded} pts`);
        setTimeout(() => setStreakMsg(''), 3500);
      }
    } catch {}
  };

  const onLike = async () => {
    if (!prompt) return;
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPrompt({ ...prompt, is_liked: !prompt.is_liked, likes: prompt.likes + (prompt.is_liked ? -1 : 1) });
    try {
      const r = await api.likePrompt(prompt.id);
      setPrompt((p) => p ? { ...p, is_liked: r.is_liked, likes: r.likes } : p);
    } catch {}
  };

  const onShare = async () => {
    if (!prompt) return;
    const message = `${prompt.title}\n\n${prompt.content}\n\n— via PromptVeer`;
    try {
      if (Platform.OS === 'web') {
        await Clipboard.setStringAsync(message);
      } else {
        await Share.share({ message });
      }
    } catch {}
    try {
      const r = await api.sharePrompt(prompt.id);
      setPrompt((p) => p ? { ...p, shares: r.shares } : p);
    } catch {}
  };

  const onDelete = () => {
    if (!prompt) return;
    Alert.alert('Delete prompt', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await api.deletePrompt(prompt.id); router.back(); } catch {}
      } },
    ]);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color={COLORS.gold} size="large" /></View>;
  if (!prompt) return (
    <View style={styles.center}>
      <Text style={{ color: COLORS.textSecondary }}>Prompt not found.</Text>
      <TouchableOpacity onPress={() => router.back()}><Text style={styles.back}>← Go back</Text></TouchableOpacity>
    </View>
  );

  const isAuthor = user?.user_id === prompt.author_id;
  const meta = [prompt.subcategory, prompt.tool, prompt.industry, prompt.use_case, prompt.content_type].filter(Boolean) as string[];

  return (
    <View style={styles.container}>
      <View style={[styles.topBar, { paddingTop: insets.top + 6 }]}>
        <Pressable onPress={() => router.back()} hitSlop={10}><Text style={styles.backIcon}>←</Text></Pressable>
        {isAuthor && (
          <Pressable onPress={onDelete} hitSlop={10}><Text style={styles.deleteIcon}>🗑️</Text></Pressable>
        )}
      </View>

      <ScrollView contentContainerStyle={{ padding: SPACING.md, paddingBottom: 160 }} showsVerticalScrollIndicator={false}>
        <View style={styles.catBadge}><Text style={styles.catText}>{prompt.category}</Text></View>
        <Text style={styles.title}>{prompt.title}</Text>

        <View style={styles.authorRow}>
          <Text style={styles.author}>by {prompt.author_name}</Text>
          <Text style={styles.dot}>·</Text>
          <Text style={styles.time}>{timeAgo(prompt.created_at)}</Text>
        </View>

        <View style={styles.metaRow}>
          <DifficultyBadge level={prompt.difficulty} />
          {meta.map((m) => (
            <View key={m} style={styles.metaChip}><Text style={styles.metaText}>{m}</Text></View>
          ))}
        </View>

        <View style={styles.promptBox}>
          <View style={styles.promptBoxHeader}>
            <Text style={styles.promptLabel}>PROMPT</Text>
            <TouchableOpacity onPress={onCopy}>
              <Text style={styles.copyInline}>{copied ? '✓ Copied' : '📋 Copy'}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.promptContent} selectable>{prompt.content}</Text>
        </View>
      </ScrollView>

      {/* Sticky action bar */}
      {streakMsg ? (
        <View style={[styles.streakToast, { bottom: insets.bottom + 84 }]}>
          <Text style={styles.streakToastText}>{streakMsg}</Text>
        </View>
      ) : null}
      <View style={[styles.actionBar, { paddingBottom: insets.bottom + 10 }]}>
        <Pressable style={styles.iconBtn} onPress={onLike} testID="detail-like-btn">
          <Text style={styles.iconEmoji}>{prompt.is_liked ? '❤️' : '🤍'}</Text>
          <Text style={styles.iconCount}>{formatCount(prompt.likes)}</Text>
        </Pressable>
        <Pressable style={styles.iconBtn} onPress={onShare} testID="detail-share-btn">
          <Text style={styles.iconEmoji}>↗️</Text>
          <Text style={styles.iconCount}>{formatCount(prompt.shares)}</Text>
        </Pressable>
        <TouchableOpacity style={styles.copyBtn} onPress={onCopy} testID="detail-copy-btn">
          <Text style={styles.copyBtnText}>{copied ? '✓ Copied!' : '📋 Copy Prompt'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center', gap: 12 },
  back: { color: COLORS.gold, marginTop: 12, fontWeight: '700' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: SPACING.md, paddingBottom: 8 },
  backIcon: { color: COLORS.white, fontSize: 28, fontWeight: '700' },
  deleteIcon: { fontSize: 20 },
  catBadge: { alignSelf: 'flex-start', backgroundColor: COLORS.purpleGlow, paddingHorizontal: 12, paddingVertical: 5, borderRadius: RADIUS.pill },
  catText: { color: COLORS.purpleLight, fontWeight: '700', fontSize: 12.5 },
  title: { color: COLORS.white, fontSize: 24, fontWeight: '900', marginTop: 12, lineHeight: 30 },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  author: { color: COLORS.gold, fontSize: 13.5, fontWeight: '700' },
  dot: { color: COLORS.textMuted },
  time: { color: COLORS.textMuted, fontSize: 13 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  metaChip: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.pill },
  metaText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600' },
  promptBox: {
    marginTop: 20, backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border,
  },
  promptBoxHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  promptLabel: { color: COLORS.textMuted, fontSize: 11.5, fontWeight: '800', letterSpacing: 1 },
  copyInline: { color: COLORS.gold, fontWeight: '700', fontSize: 13 },
  promptContent: { color: COLORS.text, fontSize: 15.5, lineHeight: 24 },
  actionBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center',
    gap: 12, paddingHorizontal: SPACING.md, paddingTop: 12, backgroundColor: COLORS.backgroundAlt,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  iconBtn: { alignItems: 'center', paddingHorizontal: 6 },
  iconEmoji: { fontSize: 22 },
  iconCount: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '700', marginTop: 2 },
  copyBtn: { flex: 1, backgroundColor: COLORS.gold, paddingVertical: 15, borderRadius: RADIUS.lg, alignItems: 'center' },
  copyBtnText: { color: '#2A1400', fontWeight: '800', fontSize: 15.5 },
  streakToast: {
    position: 'absolute', left: SPACING.md, right: SPACING.md, backgroundColor: COLORS.purple,
    borderRadius: RADIUS.pill, paddingVertical: 10, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.gold,
  },
  streakToastText: { color: COLORS.white, fontWeight: '800', fontSize: 14 },
});
