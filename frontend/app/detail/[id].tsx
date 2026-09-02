import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert, Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { api, VaultEntry, timeAgo } from '../../utils/api';
import { COLORS, SPACING, RADIUS, GLASS } from '../../constants/theme';
import { CATEGORY_CONFIG } from '../../constants/categories';

export default function DetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [entry, setEntry] = useState<VaultEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadEntry();
  }, [id]);

  const loadEntry = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await api.getEntry(id as string);
      setEntry(data);
      setEditContent(data.content);
    } catch {
      Alert.alert('Error', 'Could not load entry.');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!entry || !editContent.trim()) return;
    setSaving(true);
    try {
      const updated = await api.updateEntry(entry.id, { content: editContent.trim() });
      setEntry(updated);
      setEditing(false);
    } catch {
      Alert.alert('Error', 'Could not save changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = async () => {
    if (!entry) return;
    await Clipboard.setStringAsync(entry.content);
    Alert.alert('Copied!', 'Content copied to clipboard.');
  };

  const handleFavorite = async () => {
    if (!entry) return;
    try {
      const updated = await api.updateEntry(entry.id, { is_favorite: !entry.is_favorite });
      setEntry(updated);
    } catch {
      Alert.alert('Error', 'Could not update favorite.');
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Entry',
      'This will permanently delete this entry.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteEntry(entry!.id);
              router.back();
            } catch {
              Alert.alert('Error', 'Could not delete entry.');
            }
          },
        },
      ]
    );
  };

  const handleSmartAction = async () => {
    if (!entry) return;
    const content = entry.content.trim();
    try {
      if (entry.category === 'URL') {
        const url = content.startsWith('http') ? content : `https://${content}`;
        await Linking.openURL(url);
      } else if (entry.category === 'PhoneNumber') {
        const phone = content.replace(/[^\d+]/g, '');
        await Linking.openURL(`tel:${phone}`);
      } else if (entry.category === 'Email') {
        await Linking.openURL(`mailto:${content}`);
      } else if (entry.category === 'Address') {
        await Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(content)}`);
      }
    } catch {
      Alert.alert('Error', 'Could not open this action.');
    }
  };

  const getSmartActionLabel = () => {
    if (!entry) return null;
    switch (entry.category) {
      case 'URL': return { label: 'Open Link', icon: 'open-outline' };
      case 'PhoneNumber': return { label: 'Call', icon: 'call-outline' };
      case 'Email': return { label: 'Send Email', icon: 'mail-outline' };
      case 'Address': return { label: 'Open Maps', icon: 'location-outline' };
      default: return null;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color={COLORS.cyan} size="large" style={{ marginTop: 100 }} />
      </SafeAreaView>
    );
  }

  if (!entry) return null;

  const cat = CATEGORY_CONFIG[entry.category] || CATEGORY_CONFIG.Custom;
  const smartAction = getSmartActionLabel();

  return (
    <SafeAreaView style={styles.container} testID="detail-screen">
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          testID="detail-back-btn"
        >
          <Ionicons name="arrow-back" size={22} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Entry Detail</Text>
        <TouchableOpacity
          onPress={handleFavorite}
          style={styles.favBtn}
          testID="detail-favorite-btn"
        >
          <Text style={styles.favIcon}>{entry.is_favorite ? '⭐' : '☆'}</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Category Badge */}
          <View style={styles.metaRow}>
            <View style={[styles.catBadge, { backgroundColor: cat.bg }]}>
              <Text style={[styles.catBadgeText, { color: cat.color }]}>
                {cat.emoji}  {cat.label}
              </Text>
            </View>
            <View style={styles.metaRight}>
              <Text style={styles.confidenceBadge}>
                {Math.round(entry.confidence * 100)}% match
              </Text>
            </View>
          </View>

          {/* Content */}
          <View style={styles.contentCard} testID="entry-content-card">
            {editing ? (
              <>
                <TextInput
                  style={styles.editInput}
                  value={editContent}
                  onChangeText={setEditContent}
                  multiline
                  autoFocus
                  testID="edit-content-input"
                />
                <View style={styles.editActions}>
                  <TouchableOpacity
                    style={styles.editCancelBtn}
                    onPress={() => { setEditing(false); setEditContent(entry.content); }}
                    testID="edit-cancel-btn"
                  >
                    <Text style={styles.editCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.editSaveBtn}
                    onPress={handleSaveEdit}
                    disabled={saving}
                    testID="edit-save-btn"
                  >
                    {saving ? (
                      <ActivityIndicator color="#000" size="small" />
                    ) : (
                      <Text style={styles.editSaveText}>Save Changes</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.contentText} selectable>{entry.content}</Text>
                <TouchableOpacity
                  style={styles.editTrigger}
                  onPress={() => setEditing(true)}
                  testID="edit-trigger-btn"
                >
                  <Ionicons name="pencil-outline" size={14} color={COLORS.textSecondary} />
                  <Text style={styles.editTriggerText}>Tap to edit</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* AI Summary */}
          {entry.summary && (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>💡 AI Summary</Text>
              <Text style={styles.summaryText}>{entry.summary}</Text>
            </View>
          )}

          {/* Smart Actions */}
          {smartAction && (
            <TouchableOpacity
              style={styles.smartActionBtn}
              onPress={handleSmartAction}
              testID="smart-action-btn"
            >
              <Ionicons name={smartAction.icon as any} size={20} color={COLORS.background} />
              <Text style={styles.smartActionText}>{smartAction.label}</Text>
            </TouchableOpacity>
          )}

          {/* Quick Actions */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={handleCopy}
              testID="copy-btn"
            >
              <Ionicons name="copy-outline" size={20} color={COLORS.white} />
              <Text style={styles.actionBtnText}>Copy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { borderColor: COLORS.error }]}
              onPress={handleDelete}
              testID="delete-btn"
            >
              <Ionicons name="trash-outline" size={20} color={COLORS.error} />
              <Text style={[styles.actionBtnText, { color: COLORS.error }]}>Delete</Text>
            </TouchableOpacity>
          </View>

          {/* Tags */}
          {entry.tags.length > 0 && (
            <View style={styles.tagsSection}>
              <Text style={styles.tagsLabel}>Tags</Text>
              <View style={styles.tagsRow}>
                {entry.tags.map((tag, i) => (
                  <View key={i} style={styles.tag}>
                    <Text style={styles.tagText}>#{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Timestamps */}
          <View style={styles.timestamps}>
            <Text style={styles.timestampText}>
              📅 Saved: {new Date(entry.created_at).toLocaleString()}
            </Text>
            {entry.updated_at !== entry.created_at && (
              <Text style={styles.timestampText}>
                ✏️ Edited: {timeAgo(entry.updated_at)}
              </Text>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: COLORS.white },
  favBtn: { padding: 4, minWidth: 32, alignItems: 'center' },
  favIcon: { fontSize: 22 },
  scroll: { padding: SPACING.md, gap: 14, paddingBottom: 40 },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  catBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: RADIUS.pill,
  },
  catBadgeText: { fontSize: 14, fontWeight: '700' },
  metaRight: { alignItems: 'flex-end', gap: 4 },
  confidenceBadge: { fontSize: 12, color: COLORS.textSecondary },
  contentCard: {
    ...GLASS,
    padding: 20,
    gap: 12,
  },
  contentText: {
    fontSize: 17,
    color: COLORS.white,
    lineHeight: 26,
  },
  editTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  editTriggerText: { fontSize: 13, color: COLORS.textSecondary },
  editInput: {
    fontSize: 17,
    color: COLORS.white,
    lineHeight: 26,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  editActions: { flexDirection: 'row', gap: 10, paddingTop: 12 },
  editCancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  editCancelText: { fontSize: 15, color: COLORS.textSecondary },
  editSaveBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.cyan,
    alignItems: 'center',
  },
  editSaveText: { fontSize: 15, fontWeight: '700', color: '#000' },
  summaryCard: {
    ...GLASS,
    padding: 16,
    gap: 8,
    borderColor: 'rgba(0,240,255,0.15)',
  },
  summaryLabel: { fontSize: 13, fontWeight: '700', color: COLORS.cyan },
  summaryText: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 20 },
  smartActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.cyan,
  },
  smartActionText: { fontSize: 16, fontWeight: '700', color: COLORS.background },
  actionsRow: { flexDirection: 'row', gap: 12 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  actionBtnText: { fontSize: 15, color: COLORS.white, fontWeight: '600' },
  tagsSection: { gap: 10 },
  tagsLabel: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, letterSpacing: 1 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    backgroundColor: 'rgba(157,76,221,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(157,76,221,0.25)',
  },
  tagText: { fontSize: 13, color: COLORS.amethyst, fontWeight: '600' },
  timestamps: { gap: 6, paddingTop: 8 },
  timestampText: { fontSize: 13, color: COLORS.textSecondary },
});
