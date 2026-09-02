import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, Alert, ActivityIndicator, Switch,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import * as Clipboard from 'expo-clipboard';
import { api } from '../../utils/api';
import { useApp } from '../../context/AppContext';
import { COLORS, SPACING, RADIUS, GLASS } from '../../constants/theme';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function SettingRow({
  icon,
  label,
  subtitle,
  onPress,
  danger,
  testID,
  right,
}: {
  icon: string;
  label: string;
  subtitle?: string;
  onPress?: () => void;
  danger?: boolean;
  testID?: string;
  right?: React.ReactNode;
}) {
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      disabled={!onPress}
      testID={testID}
      activeOpacity={0.7}
    >
      <Text style={styles.rowIcon}>{icon}</Text>
      <View style={styles.rowContent}>
        <Text style={[styles.rowLabel, danger && { color: COLORS.error }]}>{label}</Text>
        {subtitle && <Text style={styles.rowSubtitle}>{subtitle}</Text>}
      </View>
      {right || (onPress && <Ionicons name="chevron-forward" size={16} color={COLORS.textSecondary} />)}
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const [exporting, setExporting] = useState(false);
  const [stats, setStats] = useState({ total: 0, favorites: 0 });
  const router = useRouter();
  const { setUnlocked } = useApp();

  useFocusEffect(
    useCallback(() => {
      api.getStats().then(setStats).catch(() => {});
    }, [])
  );

  const handleExport = async (format: 'json' | 'txt') => {
    setExporting(true);
    try {
      const result = await api.exportEntries(format);
      const dataStr =
        format === 'json'
          ? JSON.stringify(result.data, null, 2)
          : (result.data as string);

      await Clipboard.setStringAsync(dataStr);
      Alert.alert(
        'Export Complete',
        `${result.count} entries exported as ${format.toUpperCase()} and copied to clipboard!`
      );
    } catch {
      Alert.alert('Export Failed', 'Could not export entries. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const handleChangePin = () => {
    Alert.alert(
      'Change PIN',
      'You will need to set a new PIN. Your vault will be locked.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Change',
          onPress: async () => {
            try {
              try {
                await SecureStore.deleteItemAsync('vault_pin');
              } catch {
                // SecureStore not available on web
              }
              await api.resetPin();
              setUnlocked(false);
              router.replace('/setup-pin');
            } catch {
              Alert.alert('Error', 'Could not reset PIN.');
            }
          },
        },
      ]
    );
  };

  const handleDeleteAll = () => {
    Alert.alert(
      '⚠️ Delete All Entries',
      'This will permanently delete ALL entries from your vault. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Are you absolutely sure?',
              'All data will be permanently lost.',
              [
                { text: 'No, Keep Data', style: 'cancel' },
                {
                  text: 'Yes, Delete Everything',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      const entries = await api.getEntries();
                      await Promise.all(entries.map((e) => api.deleteEntry(e.id)));
                      setStats({ total: 0, favorites: 0 });
                      Alert.alert('Done', 'All entries deleted.');
                    } catch {
                      Alert.alert('Error', 'Failed to delete all entries.');
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const handleLock = () => {
    setUnlocked(false);
    router.replace('/lock');
  };

  return (
    <SafeAreaView style={styles.container} testID="settings-screen">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
        </View>

        {/* Vault Stats */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: COLORS.cyan }]}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total Entries</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: COLORS.gold }]}>{stats.favorites}</Text>
            <Text style={styles.statLabel}>Favorites</Text>
          </View>
        </View>

        <Section title="Security">
          <SettingRow
            icon="🔑"
            label="Change PIN"
            subtitle="Update your vault unlock code"
            onPress={handleChangePin}
            testID="change-pin-btn"
          />
          <SettingRow
            icon="🔒"
            label="Lock Vault"
            subtitle="Lock immediately"
            onPress={handleLock}
            testID="lock-now-btn"
          />
        </Section>

        <Section title="Data & Export">
          {exporting ? (
            <View style={styles.row}>
              <ActivityIndicator color={COLORS.cyan} />
              <Text style={[styles.rowLabel, { marginLeft: 12 }]}>Exporting…</Text>
            </View>
          ) : (
            <>
              <SettingRow
                icon="📋"
                label="Export as JSON"
                subtitle="Copy structured data to clipboard"
                onPress={() => handleExport('json')}
                testID="export-json-btn"
              />
              <SettingRow
                icon="📄"
                label="Export as Text"
                subtitle="Copy readable text to clipboard"
                onPress={() => handleExport('txt')}
                testID="export-txt-btn"
              />
            </>
          )}
        </Section>

        <Section title="About">
          <SettingRow icon="🤖" label="TextVault AI" subtitle="Version 1.0.0" />
          <SettingRow
            icon="🛡️"
            label="Security"
            subtitle="PIN lock + encrypted cloud storage"
          />
          <SettingRow
            icon="✨"
            label="AI Engine"
            subtitle="Claude Haiku 4.5 — auto-categorization"
          />
        </Section>

        <Section title="Danger Zone">
          <SettingRow
            icon="🗑️"
            label="Delete All Entries"
            subtitle="Permanently remove all vault data"
            onPress={handleDeleteAll}
            danger
            testID="delete-all-btn"
          />
        </Section>

        <Text style={styles.footer}>TextVault AI · Your intelligent text vault</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { paddingBottom: 48 },
  header: { paddingHorizontal: SPACING.md, paddingTop: SPACING.lg, paddingBottom: SPACING.md },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.white, letterSpacing: -0.5 },
  statsCard: {
    ...GLASS,
    flexDirection: 'row',
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
    padding: 20,
  },
  statItem: { flex: 1, alignItems: 'center', gap: 4 },
  statNum: { fontSize: 32, fontWeight: '800' },
  statLabel: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  statDivider: { width: 1, backgroundColor: COLORS.border, marginVertical: 8 },
  section: { marginBottom: SPACING.lg },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    paddingHorizontal: SPACING.md,
    marginBottom: 8,
  },
  sectionBody: {
    ...GLASS,
    marginHorizontal: SPACING.md,
    padding: 0,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  rowIcon: { fontSize: 20, width: 28 },
  rowContent: { flex: 1 },
  rowLabel: { fontSize: 15, color: COLORS.white, fontWeight: '500' },
  rowSubtitle: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  footer: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: 8,
    paddingHorizontal: SPACING.md,
  },
});
