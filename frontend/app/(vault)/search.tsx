import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  StyleSheet, SafeAreaView, ActivityIndicator, Keyboard,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api, VaultEntry, timeAgo } from '../../utils/api';
import { COLORS, SPACING, RADIUS, GLASS } from '../../constants/theme';
import { CATEGORY_CONFIG } from '../../constants/categories';

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<VaultEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      return () => {
        // Clear debounce on blur
        clearTimeout(debounceRef.current);
      };
    }, [])
  );

  const handleSearch = (text: string) => {
    setQuery(text);
    clearTimeout(debounceRef.current);
    if (!text.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await api.searchEntries(text.trim());
        setResults(data);
        setSearched(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 600);
  };

  const highlightText = (text: string, query: string): string => text;

  return (
    <SafeAreaView style={styles.container} testID="search-screen">
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Search</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchBar} testID="search-bar">
        <Ionicons name="search-outline" size={20} color={COLORS.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search vault... try 'bank details' or 'my note'"
          placeholderTextColor={COLORS.textSecondary}
          value={query}
          onChangeText={handleSearch}
          autoFocus={false}
          returnKeyType="search"
          onSubmitEditing={() => Keyboard.dismiss()}
          testID="search-input"
        />
        {query.length > 0 && (
          <TouchableOpacity
            onPress={() => {
              setQuery('');
              setResults([]);
              setSearched(false);
            }}
            testID="search-clear-btn"
          >
            <Ionicons name="close-circle" size={18} color={COLORS.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Results */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.cyan} size="large" />
          <Text style={styles.loadingText}>Searching vault…</Text>
        </View>
      ) : !searched ? (
        <View style={styles.center}>
          <Text style={styles.placeholderIcon}>🔍</Text>
          <Text style={styles.placeholderTitle}>Smart Search</Text>
          <Text style={styles.placeholderText}>
            Search by content, tags, category, or let AI find what you need
          </Text>
          <View style={styles.examples}>
            {['bank details', 'phone numbers', 'URLs', 'last week'].map((ex) => (
              <TouchableOpacity
                key={ex}
                style={styles.exampleChip}
                onPress={() => handleSearch(ex)}
                testID={`search-example-${ex}`}
              >
                <Text style={styles.exampleText}>"{ex}"</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : results.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.placeholderIcon}>🤷</Text>
          <Text style={styles.placeholderTitle}>No results found</Text>
          <Text style={styles.placeholderText}>
            Try different keywords or check your vault categories
          </Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={styles.resultCount}>
              {results.length} result{results.length !== 1 ? 's' : ''} for "{query}"
            </Text>
          }
          renderItem={({ item }) => {
            const cat = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG.Custom;
            return (
              <TouchableOpacity
                style={styles.resultCard}
                onPress={() => router.push(`/detail/${item.id}`)}
                testID={`search-result-${item.id}`}
                activeOpacity={0.75}
              >
                <View style={styles.resultHeader}>
                  <View style={[styles.catBadge, { backgroundColor: cat.bg }]}>
                    <Text style={[styles.catBadgeText, { color: cat.color }]}>
                      {cat.emoji}  {cat.label}
                    </Text>
                  </View>
                  <Text style={styles.timeText}>{timeAgo(item.created_at)}</Text>
                </View>
                <Text style={styles.resultContent} numberOfLines={3}>
                  {item.content}
                </Text>
                {item.tags.length > 0 && (
                  <Text style={styles.resultTags}>
                    {item.tags.slice(0, 3).map((t) => `#${t}`).join('  ')}
                  </Text>
                )}
              </TouchableOpacity>
            );
          }}
          testID="search-results-list"
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: SPACING.md, paddingTop: SPACING.lg, paddingBottom: SPACING.sm },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.white, letterSpacing: -0.5 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.white,
    padding: 0,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  loadingText: { color: COLORS.textSecondary, fontSize: 15, marginTop: 8 },
  placeholderIcon: { fontSize: 56 },
  placeholderTitle: { fontSize: 20, fontWeight: '700', color: COLORS.white, textAlign: 'center' },
  placeholderText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  examples: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  exampleChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
    backgroundColor: 'rgba(0,240,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0,240,255,0.25)',
  },
  exampleText: { fontSize: 13, color: COLORS.cyan, fontWeight: '600' },
  list: { paddingHorizontal: SPACING.md, paddingBottom: 100 },
  resultCount: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 12,
    fontWeight: '500',
  },
  resultCard: {
    ...GLASS,
    marginBottom: 10,
    padding: 16,
    gap: 8,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  catBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
  },
  catBadgeText: { fontSize: 12, fontWeight: '700' },
  timeText: { fontSize: 12, color: COLORS.textSecondary },
  resultContent: { fontSize: 15, color: COLORS.white, lineHeight: 22 },
  resultTags: { fontSize: 12, color: COLORS.amethyst, fontWeight: '600' },
});
