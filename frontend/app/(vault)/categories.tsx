import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, SafeAreaView, ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { api } from '../../utils/api';
import { COLORS, SPACING, RADIUS, GLASS } from '../../constants/theme';
import { CATEGORY_CONFIG, CATEGORY_KEYS } from '../../constants/categories';

interface CategoryStat {
  category: string;
  count: number;
}

export default function CategoriesScreen() {
  const [stats, setStats] = useState<CategoryStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalEntries, setTotalEntries] = useState(0);
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [])
  );

  const loadStats = async () => {
    setLoading(true);
    try {
      const [statsData, totalData] = await Promise.all([
        api.getCategoryStats(),
        api.getStats(),
      ]);
      setStats(statsData);
      setTotalEntries(totalData.total);
    } catch {
      // Silent
    } finally {
      setLoading(false);
    }
  };

  // Build full category list with counts (including 0-count categories)
  const allCats = CATEGORY_KEYS.map((key) => {
    const stat = stats.find((s) => s.category === key);
    return { category: key, count: stat?.count || 0 };
  }).sort((a, b) => b.count - a.count);

  const navigateToCategory = (cat: string) => {
    // Navigate to home with category filter applied
    router.push({ pathname: '/(vault)/home' });
  };

  const renderCategory = ({ item }: { item: { category: string; count: number } }) => {
    const cfg = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG.Custom;
    const percentage = totalEntries > 0 ? (item.count / totalEntries) * 100 : 0;

    return (
      <TouchableOpacity
        style={styles.catCard}
        onPress={() => navigateToCategory(item.category)}
        testID={`category-card-${item.category}`}
        activeOpacity={0.75}
      >
        <View style={[styles.catIconContainer, { backgroundColor: cfg.bg }]}>
          <Text style={styles.catEmoji}>{cfg.emoji}</Text>
        </View>
        <View style={styles.catInfo}>
          <Text style={styles.catName}>{cfg.label}</Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${percentage}%`, backgroundColor: cfg.color },
              ]}
            />
          </View>
        </View>
        <View style={styles.catCount}>
          <Text style={[styles.catCountNum, { color: cfg.color }]}>{item.count}</Text>
          <Text style={styles.catCountLabel}>items</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} testID="categories-screen">
      <View style={styles.header}>
        <Text style={styles.title}>Categories</Text>
        <Text style={styles.subtitle}>{totalEntries} entries organized</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.cyan} size="large" />
        </View>
      ) : (
        <FlatList
          data={allCats}
          keyExtractor={(item) => item.category}
          renderItem={renderCategory}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.statsRow}>
              {[
                { label: 'Total', value: totalEntries, color: COLORS.cyan },
                {
                  label: 'Categories',
                  value: stats.filter((s) => s.count > 0).length,
                  color: COLORS.amethyst,
                },
                {
                  label: 'Most',
                  value:
                    stats.length > 0
                      ? CATEGORY_CONFIG[stats[0]?.category]?.label || stats[0]?.category
                      : '—',
                  color: COLORS.gold,
                },
              ].map((s) => (
                <View key={s.label} style={styles.statCard}>
                  <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
              ))}
            </View>
          }
          testID="categories-list"
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: SPACING.md, paddingTop: SPACING.lg, paddingBottom: SPACING.sm },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.white, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { paddingHorizontal: SPACING.md, paddingBottom: 40 },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
    marginTop: 8,
  },
  statCard: {
    flex: 1,
    ...GLASS,
    padding: 16,
    alignItems: 'center',
    gap: 4,
  },
  statValue: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  catCard: {
    ...GLASS,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    padding: 16,
    gap: 14,
  },
  catIconContainer: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  catEmoji: { fontSize: 26 },
  catInfo: { flex: 1, gap: 6 },
  catName: { fontSize: 16, fontWeight: '700', color: COLORS.white },
  progressBar: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 2 },
  catCount: { alignItems: 'center', minWidth: 48 },
  catCountNum: { fontSize: 22, fontWeight: '800' },
  catCountLabel: { fontSize: 11, color: COLORS.textSecondary },
});
