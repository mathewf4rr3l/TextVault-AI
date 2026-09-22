import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Pressable,
  Share, Platform, Alert, TextInput, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { api, Prompt, Review, Folder, formatCount, timeAgo } from '../../utils/api';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import { useApp } from '../../context/AppContext';
import DifficultyBadge from '../../src/components/DifficultyBadge';
import StarRating from '../../src/components/StarRating';

export default function PromptDetail() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useApp();
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [streakMsg, setStreakMsg] = useState('');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewText, setReviewText] = useState('');
  const [savingRating, setSavingRating] = useState(false);
  const [showSave, setShowSave] = useState(false);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [newFolder, setNewFolder] = useState('');
  const [savedMsg, setSavedMsg] = useState('');
  const [showReport, setShowReport] = useState(false);
  const [reported, setReported] = useState(false);

  const REPORT_REASONS: { key: string; label: string }[] = [
    { key: 'spam', label: '🚫 Spam or advertising' },
    { key: 'low_quality', label: '👎 Low quality / not useful' },
    { key: 'copied', label: '📋 Copied / stolen prompt' },
    { key: 'other', label: '⚠️ Something else' },
  ];

  const submitReport = async (reason: string) => {
    if (!prompt) return;
    setShowReport(false);
    setReported(true);
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSavedMsg('Thanks — our team will review it');
    setTimeout(() => setSavedMsg(''), 3000);
    try { await api.reportPrompt(prompt.id, reason); } catch {}
  };

  const openSave = async () => {
    setShowSave(true);
    try { setFolders(await api.getFolders()); } catch {}
  };

  const saveToFolder = async (folderId: string, name: string) => {
    if (!prompt) return;
    try {
      await api.addToFolder(folderId, prompt.id);
      setShowSave(false);
      setSavedMsg(`Saved to "${name}"`);
      setTimeout(() => setSavedMsg(''), 2500);
    } catch {}
  };

  const createAndSave = async () => {
    if (!newFolder.trim() || !prompt) return;
    try {
      const f = await api.createFolder(newFolder.trim());
      setNewFolder('');
      await saveToFolder(f.id, f.name);
    } catch {}
  };

  const toggleHelpful = async (rid?: string) => {
    if (!rid) return;
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    setReviews((prev) => prev.map((rv) =>
      rv.id === rid
        ? { ...rv, is_helpful: !rv.is_helpful, helpful_count: (rv.helpful_count || 0) + (rv.is_helpful ? -1 : 1) }
        : rv));
    try { await api.markHelpful(rid); } catch {}
  };

  useEffect(() => {
    (async () => {
      try {
        const [p, r] = await Promise.all([api.getPrompt(id), api.getReviews(id)]);
        setPrompt(p);
        setReviews(r);
      } catch {}
      finally { setLoading(false); }
    })();
  }, [id]);

  const submitRating = async (stars: number) => {
    if (!prompt || savingRating) return;
    setSavingRating(true);
    setPrompt({ ...prompt, my_rating: stars });
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    try {
      const r = await api.ratePrompt(prompt.id, stars, reviewText.trim() || undefined);
      setPrompt((p) => p ? { ...p, my_rating: r.my_rating, avg_rating: r.avg_rating, rating_count: r.rating_count } : p);
      if (reviewText.trim()) {
        setReviews((prev) => [
          { author_name: user?.name || 'You', stars, review: reviewText.trim(), created_at: new Date().toISOString() },
          ...prev.filter((rv) => rv.author_name !== (user?.name || 'You')),
        ]);
        setReviewText('');
      }
    } catch {}
    finally { setSavingRating(false); }
  };

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
        {isAuthor ? (
          <Pressable onPress={onDelete} hitSlop={10}><Text style={styles.deleteIcon}>🗑️</Text></Pressable>
        ) : (
          <Pressable onPress={() => setShowReport(true)} hitSlop={10} testID="report-btn" disabled={reported}>
            <Ionicons name={reported ? 'flag' : 'flag-outline'} size={22} color={reported ? COLORS.gold : COLORS.textMuted} />
          </Pressable>
        )}
      </View>

      <ScrollView contentContainerStyle={{ padding: SPACING.md, paddingBottom: 160 }} showsVerticalScrollIndicator={false}>
        <View style={styles.catBadge}><Text style={styles.catText}>{prompt.category}</Text></View>
        <Text style={styles.title}>{prompt.title}</Text>

        <Pressable style={styles.authorRow} onPress={() => router.push(`/user/${prompt.author_id}` as any)}>
          <Text style={styles.author}>by {prompt.author_name}</Text>
          <Text style={styles.dot}>·</Text>
          <Text style={styles.time}>{timeAgo(prompt.created_at)}</Text>
          <Ionicons name="chevron-forward" size={13} color={COLORS.textMuted} />
        </Pressable>

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

        {/* Ratings & Reviews */}
        <View style={styles.ratingSummary}>
          <View>
            <Text style={styles.ratingBig}>{(prompt.avg_rating ?? 0).toFixed(1)}</Text>
            <StarRating value={prompt.avg_rating ?? 0} size={16} />
            <Text style={styles.ratingCount}>{prompt.rating_count ?? 0} rating{(prompt.rating_count ?? 0) !== 1 ? 's' : ''}</Text>
          </View>
        </View>

        <View style={styles.rateBox}>
          <Text style={styles.rateLabel}>{prompt.my_rating ? 'Your rating' : 'Rate this prompt'}</Text>
          <StarRating value={prompt.my_rating ?? 0} size={30} onChange={submitRating} />
          <TextInput
            style={styles.reviewInput}
            placeholder="Add a short review (optional)…"
            placeholderTextColor={COLORS.textMuted}
            value={reviewText}
            onChangeText={setReviewText}
            multiline
            maxLength={1000}
            testID="review-input"
          />
          {reviewText.trim().length > 0 && (
            <TouchableOpacity style={styles.reviewSubmit} onPress={() => submitRating(prompt.my_rating || 5)} testID="review-submit">
              <Text style={styles.reviewSubmitText}>{savingRating ? 'Saving…' : 'Post review'}</Text>
            </TouchableOpacity>
          )}
        </View>

        {reviews.length > 0 && (
          <View style={styles.reviewsSection}>
            <Text style={styles.reviewsTitle}>Reviews ({reviews.length})</Text>
            {reviews.map((rv, i) => (
              <View key={`${rv.author_name}-${i}`} style={styles.reviewCard}>
                <View style={styles.reviewHead}>
                  <Text style={styles.reviewAuthor}>{rv.author_name}</Text>
                  <StarRating value={rv.stars} size={13} />
                </View>
                <Text style={styles.reviewBody}>{rv.review}</Text>
                <Pressable style={styles.helpfulBtn} onPress={() => toggleHelpful(rv.id)} hitSlop={6} testID={`helpful-${i}`}>
                  <Text style={[styles.helpfulText, rv.is_helpful && styles.helpfulActive]}>
                    👍 Helpful{rv.helpful_count ? ` · ${rv.helpful_count}` : ''}
                  </Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Sticky action bar */}
      {streakMsg || savedMsg ? (
        <View style={[styles.streakToast, { bottom: insets.bottom + 84 }]}>
          <Text style={styles.streakToastText}>{streakMsg || savedMsg}</Text>
        </View>
      ) : null}
      <View style={[styles.actionBar, { paddingBottom: insets.bottom + 10 }]}>
        <Pressable style={styles.iconBtn} onPress={onLike} testID="detail-like-btn">
          <Ionicons name={prompt.is_liked ? 'heart' : 'heart-outline'} size={22} color={prompt.is_liked ? COLORS.error : COLORS.textSecondary} />
          <Text style={styles.iconCount}>{formatCount(prompt.likes)}</Text>
        </Pressable>
        <Pressable style={styles.iconBtn} onPress={onShare} testID="detail-share-btn">
          <Ionicons name="share-social-outline" size={22} color={COLORS.textSecondary} />
          <Text style={styles.iconCount}>{formatCount(prompt.shares)}</Text>
        </Pressable>
        <Pressable style={styles.iconBtn} onPress={openSave} testID="detail-save-btn">
          <Ionicons name="bookmark-outline" size={22} color={COLORS.textSecondary} />
          <Text style={styles.iconCount}>Save</Text>
        </Pressable>
        <TouchableOpacity style={styles.copyBtn} onPress={onCopy} testID="detail-copy-btn">
          <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={18} color="#2A1400" />
          <Text style={styles.copyBtnText}>{copied ? 'Copied!' : 'Copy'}</Text>
        </TouchableOpacity>
      </View>

      {/* Save-to-folder modal */}
      <Modal visible={showSave} transparent animationType="slide" onRequestClose={() => setShowSave(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setShowSave(false)} />
        <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Save to folder</Text>
          <View style={styles.createRow}>
            <TextInput
              style={styles.folderInput}
              placeholder="New folder name…"
              placeholderTextColor={COLORS.textMuted}
              value={newFolder}
              onChangeText={setNewFolder}
              maxLength={60}
            />
            <TouchableOpacity style={styles.createBtn} onPress={createAndSave} disabled={!newFolder.trim()} testID="save-create-folder-btn">
              <Ionicons name="add" size={22} color="#2A1400" />
            </TouchableOpacity>
          </View>
          <ScrollView style={{ maxHeight: 280 }}>
            {folders.length === 0 ? (
              <Text style={styles.noFolders}>No folders yet. Create one above.</Text>
            ) : folders.map((f) => (
              <TouchableOpacity key={f.id} style={styles.folderRow} onPress={() => saveToFolder(f.id, f.name)}>
                <Ionicons name="folder-outline" size={20} color={COLORS.purpleLight} />
                <Text style={styles.folderName}>{f.name}</Text>
                <Text style={styles.folderCount}>{f.count}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* Report modal */}
      <Modal visible={showReport} transparent animationType="slide" onRequestClose={() => setShowReport(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setShowReport(false)} />
        <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Report this prompt</Text>
          <Text style={styles.reportSub}>Why are you reporting it? It stays visible while our team reviews.</Text>
          {REPORT_REASONS.map((r) => (
            <TouchableOpacity
              key={r.key}
              style={styles.reasonRow}
              onPress={() => submitReport(r.key)}
              testID={`report-reason-${r.key}`}
            >
              <Text style={styles.reasonText}>{r.label}</Text>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          ))}
        </View>
      </Modal>
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
  ratingSummary: { marginTop: 20, flexDirection: 'row', alignItems: 'center', gap: 16 },
  ratingBig: { color: COLORS.white, fontSize: 34, fontWeight: '900' },
  ratingCount: { color: COLORS.textMuted, fontSize: 12, marginTop: 4 },
  rateBox: {
    marginTop: 16, backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border, gap: 12,
  },
  rateLabel: { color: COLORS.white, fontSize: 14.5, fontWeight: '800' },
  reviewInput: {
    backgroundColor: COLORS.background, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border,
    color: COLORS.white, padding: 12, fontSize: 14.5, minHeight: 60, textAlignVertical: 'top',
  },
  reviewSubmit: { backgroundColor: COLORS.purple, borderRadius: RADIUS.md, paddingVertical: 11, alignItems: 'center' },
  reviewSubmitText: { color: COLORS.white, fontWeight: '800', fontSize: 14 },
  reviewsSection: { marginTop: 20, gap: 10 },
  reviewsTitle: { color: COLORS.white, fontSize: 16, fontWeight: '800' },
  reviewCard: { backgroundColor: COLORS.card, borderRadius: RADIUS.md, padding: 12, borderWidth: 1, borderColor: COLORS.border },
  reviewHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  reviewAuthor: { color: COLORS.gold, fontWeight: '700', fontSize: 13.5 },
  reviewBody: { color: COLORS.text, fontSize: 14, lineHeight: 20 },
  helpfulBtn: { marginTop: 8, alignSelf: 'flex-start' },
  helpfulText: { color: COLORS.textSecondary, fontSize: 12.5, fontWeight: '700' },
  helpfulActive: { color: COLORS.gold },
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
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  modalSheet: {
    backgroundColor: COLORS.backgroundAlt, borderTopLeftRadius: 22, borderTopRightRadius: 22,
    paddingHorizontal: SPACING.md, paddingTop: 10, borderTopWidth: 1, borderColor: COLORS.border,
  },
  modalHandle: {
    alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.border, marginBottom: 14,
  },
  modalTitle: { color: COLORS.white, fontSize: 18, fontWeight: '900', marginBottom: 14 },
  createRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  folderInput: {
    flex: 1, backgroundColor: COLORS.card, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border,
    color: COLORS.white, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
  },
  createBtn: {
    width: 46, borderRadius: RADIUS.md, backgroundColor: COLORS.gold, justifyContent: 'center', alignItems: 'center',
  },
  noFolders: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center', paddingVertical: 20 },
  folderRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  folderName: { color: COLORS.white, fontSize: 15, fontWeight: '600', flex: 1 },
  folderCount: { color: COLORS.textMuted, fontSize: 13, fontWeight: '700' },
  reportSub: { color: COLORS.textSecondary, fontSize: 13.5, lineHeight: 19, marginBottom: 14, marginTop: -6 },
  reasonRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.card, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 14, paddingVertical: 15, marginBottom: 10,
  },
  reasonText: { color: COLORS.white, fontSize: 15, fontWeight: '600' },
});
