import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator, Pressable, Alert, Platform, Share, Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { api, Prompt, FolderDetail } from '../../utils/api';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import { useTaxonomy, categoryEmojiMap } from '../../src/lib/taxonomy';
import PromptCard from '../../src/components/PromptCard';

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL || '';

export default function FolderScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const taxonomy = useTaxonomy();
  const emojiMap = categoryEmojiMap(taxonomy);
  const [data, setData] = useState<FolderDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try { setData(await api.getFolder(id)); } catch {}
    finally { setLoading(false); }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const removeItem = async (p: Prompt) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setData((prev) => prev ? { ...prev, prompts: prev.prompts.filter((x) => x.id !== p.id), count: prev.count - 1 } : prev);
    try { await api.removeFromFolder(id, p.id); } catch {}
  };

  const onDeleteFolder = () => {
    Alert.alert('Delete folder', 'This removes the folder (prompts stay in the library).', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { try { await api.deleteFolder(id); router.back(); } catch {} } },
    ]);
  };

  const togglePublic = async () => {
    if (!data) return;
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    const next = !data.is_public;
    setData({ ...data, is_public: next });
    try { await api.publishFolder(id); } catch { setData({ ...data, is_public: !next }); }
  };

  const onShare = async () => {
    if (!data) return;
    const link = `${BASE}/pack/${id}`;
    const message = `Check out my prompt pack "${data.name}" on PromptVeer — ${data.count} curated AI prompts:\n${link}`;
    try {
      if (Platform.OS === 'web') {
        await Share.share({ message }).catch(() => {});
      } else {
        await Share.share({ message });
      }
    } catch {}
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color={COLORS.gold} size="large" /></View>;
  if (!data) return <View style={styles.center}><Text style={{ color: COLORS.textSecondary }}>Folder not found.</Text></View>;

  return (
    <View style={styles.container}>
      <View style={[styles.top, { paddingTop: insets.top + 6 }]}>
        <Pressable onPress={() => router.back()} hitSlop={10}><Ionicons name="arrow-back" size={26} color={COLORS.white} /></Pressable>
        <Text style={styles.title} numberOfLines={1}>{data.name}</Text>
        <Pressable onPress={onDeleteFolder} hitSlop={10}><Ionicons name="trash-outline" size={22} color={COLORS.error} /></Pressable>
      </View>

      <View style={styles.publishCard}>
        <View style={styles.publishRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.publishTitle}>{data.is_public ? '🌍 Public pack' : '🔒 Private folder'}</Text>
            <Text style={styles.publishSub}>
              {data.is_public
                ? `Anyone can view & follow · ${data.followers || 0} follower${(data.followers || 0) !== 1 ? 's' : ''}`
                : 'Only you can see this. Publish to share it.'}
            </Text>
          </View>
          <Switch
            value={!!data.is_public}
            onValueChange={togglePublic}
            trackColor={{ false: COLORS.border, true: COLORS.gold }}
            thumbColor={COLORS.white}
            testID="publish-switch"
          />
        </View>
        {data.is_public && (
          <Pressable style={styles.shareBtn} onPress={onShare} testID="share-pack-btn">
            <Ionicons name="share-social-outline" size={17} color="#2A1400" />
            <Text style={styles.shareBtnText}>Share pack</Text>
          </Pressable>
        )}
      </View>

      <FlatList
        data={data.prompts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: SPACING.md, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View>
            <PromptCard
              prompt={item}
              categoryEmoji={emojiMap[item.category]}
              onPress={() => router.push(`/prompt/${item.id}` as any)}
              onToggleLike={() => { api.likePrompt(item.id).catch(() => {}); }}
            />
            <Pressable style={styles.removeBtn} onPress={() => removeItem(item)}>
              <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
              <Text style={styles.removeText}>Remove</Text>
            </Pressable>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>This folder is empty.{'\n'}Save prompts to it from any prompt page.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: SPACING.md, paddingBottom: 10 },
  title: { color: COLORS.white, fontSize: 19, fontWeight: '800', flex: 1 },
  publishCard: {
    marginHorizontal: SPACING.md, marginBottom: 8, backgroundColor: COLORS.card, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, gap: 12,
  },
  publishRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  publishTitle: { color: COLORS.white, fontSize: 15, fontWeight: '800' },
  publishSub: { color: COLORS.textSecondary, fontSize: 12.5, marginTop: 3, lineHeight: 17 },
  shareBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    backgroundColor: COLORS.gold, borderRadius: RADIUS.md, paddingVertical: 11,
  },
  shareBtnText: { color: '#2A1400', fontWeight: '800', fontSize: 14 },
  removeBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-end', marginTop: -8, marginBottom: 14 },
  removeText: { color: COLORS.textMuted, fontSize: 12.5, fontWeight: '600' },
  empty: { color: COLORS.textMuted, textAlign: 'center', marginTop: 40, fontSize: 14.5, lineHeight: 21 },
});
