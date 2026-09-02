import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  SafeAreaView, RefreshControl, Modal, ScrollView,
  ActivityIndicator, Alert,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api, VaultEntry, timeAgo } from '../../utils/api';
import { useApp } from '../../context/AppContext';
import { COLORS, SPACING, RADIUS, GLASS } from '../../constants/theme';
import { CATEGORY_CONFIG, CATEGORY_FILTERS } from '../../constants/categories';

function EntryCard({
  entry,
  onAction,
}: {
  entry: VaultEntry;
  onAction: (e: VaultEntry) => void;
}) {
  const router = useRouter();
  const cat = CATEGORY_CONFIG[entry.category] || CATEGORY_CONFIG.Custom;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/detail/${entry.id}`)}
      onLongPress={() => onAction(entry)}
      testID={`entry-card-${entry.id}`}
      activeOpacity={0.75}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.catBadge, { backgroundColor: cat.bg }]}>
          <Text style={[styles.catBadgeText, { color: cat.color }]}>
            {cat.emoji}  {cat.label}
          </Text>
        </View>
        <View style={styles.cardHeaderRight}>
          {entry.is_favorite && <Text style={styles.favStar}>⭐</Text>}
          <Text style={styles.timeText}>{timeAgo(entry.created_at)}</Text>
          <TouchableOpacity
            onPress={() => onAction(entry)}
            testID={`entry-more-${entry.id}`}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.moreBtn}>⋮</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.contentText} numberOfLines={2}>
        {entry.content}
      </Text>

      {entry.tags.length > 0 && (
        <View style={styles.tagsRow}>
          {entry.tags.slice(0, 3).map((tag, i) => (
            <View key={i} style={styles.tag}>
              <Text style={styles.tagText}>#{tag}</Text>
            </View>
          ))}
        </View>
      )}

      {entry.summary && (
        <Text style={styles.summaryText} numberOfLines={1}>
          💡 {entry.summary}
        </Text>
      )}
    </TouchableOpacity>
  );
}

function EmptyState() {
  const router = useRouter();
  return (
    <View style={styles.emptyState} testID="empty-vault">
      <Text style={styles.emptyIcon}>🔒</Text>
      <Text style={styles.emptyTitle}>Your vault is empty</Text>
      <Text style={styles.emptySubtitle}>
        Tap the + button to save your first text, URL, or note
      </Text>
      <TouchableOpacity
        style={styles.emptyBtn}
        onPress={() => router.push('/add')}
        testID="empty-add-btn"
      >
        <Text style={styles.emptyBtnText}>+ Add First Entry</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function HomeScreen() {
  const [entries, setEntries] = useState<VaultEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCat, setSelectedCat] = useState('All');
  const [actionEntry, setActionEntry] = useState<VaultEntry | null>(null);
  const [stats, setStats] = useState({ total: 0, favorites: 0 });
  const [actionLoading, setActionLoading] = useState(false);
  const router = useRouter();
  const { isUnlocked } = useApp();

  const loadEntries = async (cat = selectedCat) => {
    try {
      const [data, s] = await Promise.all([
        api.getEntries({ category: cat }),
        api.getStats(),
      ]);
      setEntries(data);
      setStats(s);
    } catch {
      // Silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (!isUnlocked) {
        router.replace('/lock');
        return;
      }
      setLoading(true);
      loadEntries(selectedCat);
    }, [isUnlocked])
  );

  const handleCatChange = (cat: string) => {
    setSelectedCat(cat);
    loadEntries(cat);
  };

  const handleAction = async (action: string) => {
    if (!actionEntry) return;
    setActionLoading(true);
    try {
      if (action === 'favorite') {
        await api.updateEntry(actionEntry.id, { is_favorite: !actionEntry.is_favorite });
        setEntries((prev) =>
          prev.map((e) =>
            e.id === actionEntry.id ? { ...e, is_favorite: !e.is_favorite } : e
          )
        );
      } else if (action === 'archive') {
        await api.updateEntry(actionEntry.id, { is_archived: true });
        setEntries((prev) => prev.filter((e) => e.id !== actionEntry.id));
      } else if (action === 'delete') {
        await api.deleteEntry(actionEntry.id);
        setEntries((prev) => prev.filter((e) => e.id !== actionEntry.id));
        setStats((s) => ({ ...s, total: Math.max(0, s.total - 1) }));
      }
    } catch {
      Alert.alert('Error', 'Action failed. Please try again.');
    } finally {
      setActionLoading(false);
      setActionEntry(null);
    }
  };

  const confirmDelete = () => {
    Alert.alert(
      'Delete Entry',
      'This entry will be permanently deleted. Continue?',
      [
        { text: 'Cancel', style: 'cancel', onPress: () => setActionEntry(null) },
        { text: 'Delete', style: 'destructive', onPress: () => handleAction('delete') },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} testID="vault-home">
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.appTitle}>TextVault AI</Text>
          <Text style={styles.statsText}>
            {stats.total} saved · {stats.favorites} starred
          </Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push('/add')}
          testID="header-add-btn"
        >
          <Ionicons name="add" size={26} color={COLORS.background} />
        </TouchableOpacity>
      </View>

      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterScroll}
        testID="category-filter-scroll"
      >
        {CATEGORY_FILTERS.map((cat) => {
          const isActive = selectedCat === cat;
          const cfg = CATEGORY_CONFIG[cat];
          return (
            <TouchableOpacity
              key={cat}
              style={[
                styles.chip,
                isActive && { backgroundColor: COLORS.cyan + '20', borderColor: COLORS.cyan },
              ]}
              onPress={() => handleCatChange(cat)}
              testID={`category-chip-${cat}`}
            >
              <Text style={[styles.chipText, isActive && { color: COLORS.cyan }]}>
                {cat === 'All' ? '⬡ All' : `${cfg?.emoji} ${cfg?.label}`}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Entry List */}
      {loading ? (
        <View style={styles.centerLoad}>
          <ActivityIndicator color={COLORS.cyan} size="large" />
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <EntryCard entry={item} onAction={setActionEntry} />
          )}
          contentContainerStyle={[
            styles.listContent,
            entries.length === 0 && { flex: 1 },
          ]}
          ListEmptyComponent={EmptyState}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadEntries();
              }}
              tintColor={COLORS.gold}
            />
          }
          showsVerticalScrollIndicator={false}
          testID="entries-list"
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/add')}
        testID="fab-add-btn"
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={30} color="#000" />
      </TouchableOpacity>

      {/* Action Modal */}
      <Modal
        visible={!!actionEntry}
        transparent
        animationType="fade"
        onRequestClose={() => setActionEntry(null)}
        testID="action-modal"
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setActionEntry(null)}
        >
          <View style={styles.actionSheet}>
            <View style={styles.actionHandle} />
            <Text style={styles.actionTitle} numberOfLines={2}>
              {actionEntry?.content.substring(0, 60)}
              {(actionEntry?.content.length ?? 0) > 60 ? '…' : ''}
            </Text>

            {actionLoading ? (
              <ActivityIndicator color={COLORS.cyan} style={{ marginVertical: 24 }} />
            ) : (
              <>
                <TouchableOpacity
                  style={styles.actionItem}
                  onPress={() => handleAction('favorite')}
                  testID="action-favorite-btn"
                >
                  <Text style={styles.actionIcon}>
                    {actionEntry?.is_favorite ? '💔' : '⭐'}
                  </Text>
                  <Text style={styles.actionText}>
                    {actionEntry?.is_favorite ? 'Remove from Favorites' : 'Add to Favorites'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionItem}
                  onPress={() => {
                    setActionEntry(null);
                    router.push(`/detail/${actionEntry?.id}`);
                  }}
                  testID="action-view-btn"
                >
                  <Text style={styles.actionIcon}>👁️</Text>
                  <Text style={styles.actionText}>View Details</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionItem}
                  onPress={() => handleAction('archive')}
                  testID="action-archive-btn"
                >
                  <Text style={styles.actionIcon}>📦</Text>
                  <Text style={styles.actionText}>Archive</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionItem, styles.actionDanger]}
                  onPress={() => {
                    setActionEntry(actionEntry);
                    confirmDelete();
                  }}
                  testID="action-delete-btn"
                >
                  <Text style={styles.actionIcon}>🗑️</Text>
                  <Text style={[styles.actionText, { color: COLORS.error }]}>Delete</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    paddingTop: SPACING.lg,
  },
  appTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: -0.5,
  },
  statsText: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.cyan,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterScroll: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  chipText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  centerLoad: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingHorizontal: SPACING.md, paddingTop: 4, paddingBottom: 100 },
  card: {
    ...GLASS,
    marginBottom: 12,
    padding: 18,
    gap: 10,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  catBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
  },
  catBadgeText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  cardHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  favStar: { fontSize: 14 },
  timeText: { fontSize: 12, color: COLORS.textSecondary },
  moreBtn: { fontSize: 18, color: COLORS.textSecondary, paddingHorizontal: 4 },
  contentText: { fontSize: 15, color: COLORS.white, lineHeight: 22 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
    backgroundColor: 'rgba(157,76,221,0.12)',
  },
  tagText: { fontSize: 11, color: COLORS.amethyst, fontWeight: '600' },
  summaryText: { fontSize: 12, color: COLORS.textSecondary, fontStyle: 'italic' },
  fab: {
    position: 'absolute',
    bottom: 28,
    right: 24,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: COLORS.cyan,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.cyan,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyIcon: { fontSize: 64 },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: COLORS.white, textAlign: 'center' },
  emptySubtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyBtn: {
    marginTop: 16,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.cyan,
  },
  emptyBtnText: { fontSize: 16, fontWeight: '700', color: '#000' },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  actionSheet: {
    backgroundColor: '#1A1A1E',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 4,
  },
  actionHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  actionTitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 12,
    lineHeight: 20,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  actionDanger: { borderBottomWidth: 0 },
  actionIcon: { fontSize: 20, width: 28 },
  actionText: { fontSize: 16, color: COLORS.white, fontWeight: '500' },
});
