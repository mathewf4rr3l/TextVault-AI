import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, KeyboardAvoidingView, Platform, ScrollView,
  ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { api, Classification } from '../utils/api';
import { COLORS, SPACING, RADIUS, GLASS } from '../constants/theme';
import { CATEGORY_CONFIG, CATEGORY_KEYS } from '../constants/categories';

export default function AddScreen() {
  const [content, setContent] = useState('');
  const [classification, setClassification] = useState<Classification | null>(null);
  const [classifying, setClassifying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showCatPicker, setShowCatPicker] = useState(false);
  const [overrideCategory, setOverrideCategory] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const router = useRouter();

  useEffect(() => {
    return () => clearTimeout(debounceRef.current);
  }, []);

  const handleTextChange = (text: string) => {
    setContent(text);
    setOverrideCategory(null);
    clearTimeout(debounceRef.current);

    if (text.trim().length < 8) {
      setClassification(null);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setClassifying(true);
      try {
        const result = await api.classifyText(text.trim());
        setClassification(result);
      } catch {
        // Fallback: keep existing
      } finally {
        setClassifying(false);
      }
    }, 1400);
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await Clipboard.getStringAsync();
      if (text) {
        handleTextChange(text);
      }
    } catch {
      Alert.alert('Error', 'Could not access clipboard.');
    }
  };

  const handleSave = async () => {
    if (!content.trim()) return;
    setSaving(true);
    try {
      const cat = overrideCategory || classification?.category;
      const tags = classification?.tags;
      await api.createEntry(content.trim(), cat, tags);
      router.back();
    } catch {
      Alert.alert('Error', 'Could not save entry. Please try again.');
      setSaving(false);
    }
  };

  const selectedCat = overrideCategory || classification?.category;
  const catCfg = selectedCat ? CATEGORY_CONFIG[selectedCat] : null;
  const canSave = content.trim().length > 0 && !saving;

  return (
    <SafeAreaView style={styles.container} testID="add-screen">
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.cancelBtn}
          testID="add-cancel-btn"
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Entry</Text>
        {saving ? (
          <ActivityIndicator color={COLORS.cyan} />
        ) : (
          <TouchableOpacity
            onPress={handleSave}
            disabled={!canSave}
            style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
            testID="add-save-btn"
          >
            <Text style={[styles.saveText, !canSave && { opacity: 0.4 }]}>Save</Text>
          </TouchableOpacity>
        )}
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Input Box */}
          <View style={styles.inputContainer} testID="input-container">
            <TextInput
              style={styles.input}
              placeholder="Drop anything here…&#10;URL, phone, address, note, ID…"
              placeholderTextColor={COLORS.textSecondary}
              multiline
              value={content}
              onChangeText={handleTextChange}
              autoFocus
              textAlignVertical="top"
              testID="content-input"
            />
            {content.length === 0 && (
              <TouchableOpacity
                style={styles.pasteBtn}
                onPress={handlePasteClipboard}
                testID="paste-clipboard-btn"
              >
                <Ionicons name="clipboard-outline" size={16} color={COLORS.cyan} />
                <Text style={styles.pasteBtnText}>Paste from Clipboard</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* AI Classification Preview */}
          {classifying && (
            <View style={styles.classifyCard} testID="classifying-indicator">
              <ActivityIndicator color={COLORS.cyan} size="small" />
              <Text style={styles.classifyingText}>AI analyzing…</Text>
            </View>
          )}

          {!classifying && classification && (
            <View style={styles.classifyCard} testID="classification-result">
              <View style={styles.classifyHeader}>
                <View style={styles.aiLabel}>
                  <Text style={styles.aiLabelText}>✨ AI Detected</Text>
                </View>
                <Text style={styles.confidenceText}>
                  {Math.round(classification.confidence * 100)}% confident
                </Text>
              </View>

              <View style={styles.classifyBody}>
                {catCfg && (
                  <TouchableOpacity
                    style={[styles.catBadge, { backgroundColor: catCfg.bg }]}
                    onPress={() => setShowCatPicker(!showCatPicker)}
                    testID="detected-category-badge"
                  >
                    <Text style={[styles.catBadgeText, { color: catCfg.color }]}>
                      {catCfg.emoji}  {catCfg.label}
                    </Text>
                    <Ionicons name="chevron-down" size={12} color={catCfg.color} style={{ marginLeft: 4 }} />
                  </TouchableOpacity>
                )}

                {classification.tags.length > 0 && (
                  <View style={styles.tagsRow}>
                    {classification.tags.map((tag, i) => (
                      <View key={i} style={styles.tag}>
                        <Text style={styles.tagText}>#{tag}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {classification.summary && (
                  <Text style={styles.summaryText}>💡 {classification.summary}</Text>
                )}
              </View>
            </View>
          )}

          {/* Category Picker */}
          {showCatPicker && (
            <View style={styles.catPicker} testID="category-picker">
              <Text style={styles.catPickerTitle}>Choose Category</Text>
              <View style={styles.catGrid}>
                {CATEGORY_KEYS.map((key) => {
                  const cfg = CATEGORY_CONFIG[key];
                  const isSelected = (overrideCategory || classification?.category) === key;
                  return (
                    <TouchableOpacity
                      key={key}
                      style={[
                        styles.catOption,
                        { backgroundColor: cfg.bg },
                        isSelected && { borderColor: cfg.color, borderWidth: 1.5 },
                      ]}
                      onPress={() => {
                        setOverrideCategory(key);
                        setShowCatPicker(false);
                      }}
                      testID={`cat-option-${key}`}
                    >
                      <Text style={styles.catOptionEmoji}>{cfg.emoji}</Text>
                      <Text style={[styles.catOptionText, { color: cfg.color }]}>{cfg.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Tips */}
          {!classification && !classifying && content.length === 0 && (
            <View style={styles.tips}>
              <Text style={styles.tipsTitle}>What can you save?</Text>
              {[
                '🔗 URLs & links',
                '📞 Phone numbers',
                '📧 Email addresses',
                '💳 Bank details & UPI IDs',
                '📝 Notes & snippets',
                '🪪 IDs & document numbers',
                '📍 Addresses & locations',
              ].map((tip) => (
                <Text key={tip} style={styles.tipItem}>{tip}</Text>
              ))}
            </View>
          )}
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
  cancelBtn: { paddingVertical: 4, minWidth: 60 },
  cancelText: { fontSize: 16, color: COLORS.textSecondary },
  headerTitle: { fontSize: 17, fontWeight: '700', color: COLORS.white },
  saveBtn: {
    backgroundColor: COLORS.cyan,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
    minWidth: 60,
    alignItems: 'center',
  },
  saveBtnDisabled: { backgroundColor: 'rgba(0,240,255,0.3)' },
  saveText: { fontSize: 15, fontWeight: '700', color: '#000' },
  scroll: { padding: SPACING.md, gap: 16, paddingBottom: 60 },
  inputContainer: {
    ...GLASS,
    padding: 20,
    minHeight: 160,
  },
  input: {
    fontSize: 17,
    color: COLORS.white,
    lineHeight: 26,
    minHeight: 100,
  },
  pasteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: 'rgba(0,240,255,0.3)',
    alignSelf: 'flex-start',
  },
  pasteBtnText: { fontSize: 14, color: COLORS.cyan, fontWeight: '600' },
  classifyCard: {
    ...GLASS,
    padding: 16,
    gap: 12,
  },
  classifyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  aiLabel: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
    backgroundColor: 'rgba(0,240,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0,240,255,0.25)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  aiLabelText: { fontSize: 12, color: COLORS.cyan, fontWeight: '700' },
  classifyingText: { fontSize: 14, color: COLORS.textSecondary, marginLeft: 8 },
  confidenceText: { fontSize: 13, color: COLORS.textSecondary },
  classifyBody: { gap: 10 },
  catBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
    alignSelf: 'flex-start',
  },
  catBadgeText: { fontSize: 14, fontWeight: '700' },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    backgroundColor: 'rgba(157,76,221,0.12)',
  },
  tagText: { fontSize: 12, color: COLORS.amethyst, fontWeight: '600' },
  summaryText: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20 },
  catPicker: { ...GLASS, padding: 16, gap: 12 },
  catPickerTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textSecondary },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.lg,
    gap: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  catOptionEmoji: { fontSize: 16 },
  catOptionText: { fontSize: 13, fontWeight: '600' },
  tips: { gap: 8, marginTop: 8 },
  tipsTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 4 },
  tipItem: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 22 },
});
