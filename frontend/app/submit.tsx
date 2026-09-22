import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Pressable,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { api } from '../utils/api';
import { COLORS, SPACING, RADIUS } from '../constants/theme';
import { useTaxonomy } from '../src/lib/taxonomy';
import { useApp } from '../context/AppContext';
import Chip from '../src/components/Chip';

export default function Submit() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const taxonomy = useTaxonomy();
  const { ensureSession } = useApp();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [tool, setTool] = useState('');
  const [difficulty, setDifficulty] = useState('Beginner');
  const [contentType, setContentType] = useState('Text');
  const [open, setOpen] = useState<string | null>('category');
  const [saving, setSaving] = useState(false);

  const cat = taxonomy?.categories.find((c) => c.name === category);
  const canSubmit = title.trim().length >= 3 && content.trim().length >= 10 && !!category;

  const submit = async () => {
    if (!canSubmit || saving) return;
    setSaving(true);
    try {
      await ensureSession();
      await api.createPrompt({
        title: title.trim(),
        content: content.trim(),
        category,
        subcategory: subcategory || undefined,
        tool: tool || undefined,
        difficulty,
        content_type: contentType,
      });
      router.replace('/(tabs)/library' as any);
      setTimeout(() => Alert.alert('🎉 Prompt submitted!', 'Your prompt is now live. Earn points as people like and share it.'), 300);
    } catch {
      Alert.alert('Error', 'Could not submit your prompt. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const Section = ({ label, value, id, children }: any) => (
    <View style={styles.field}>
      <Pressable style={styles.fieldHeader} onPress={() => setOpen(open === id ? null : id)}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <Text style={styles.fieldValue}>{value || 'Select'} {open === id ? '▲' : '▼'}</Text>
      </Pressable>
      {open === id && <View style={styles.chipWrap}>{children}</View>}
    </View>
  );

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <Pressable onPress={() => router.back()} hitSlop={10}><Text style={styles.cancel}>Cancel</Text></Pressable>
        <Text style={styles.headerTitle}>Submit Prompt</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: SPACING.md, paddingBottom: 40 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={styles.label}>Title</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Viral Reel Hook Generator"
          placeholderTextColor={COLORS.textMuted}
          value={title}
          onChangeText={setTitle}
          maxLength={140}
        />

        <Text style={styles.label}>Prompt</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          placeholder="Paste your full prompt here. Use [PLACEHOLDERS] for parts users should customize."
          placeholderTextColor={COLORS.textMuted}
          value={content}
          onChangeText={setContent}
          multiline
          textAlignVertical="top"
          maxLength={8000}
        />
        <Text style={styles.counter}>{content.length}/8000</Text>

        <Section label="Category *" value={category} id="category">
          {taxonomy?.categories.map((c) => (
            <Chip key={c.name} label={c.name} emoji={c.emoji} active={category === c.name}
              onPress={() => { setCategory(c.name); setSubcategory(''); setOpen('subcategory'); }} />
          ))}
        </Section>

        {cat && (
          <Section label="Subcategory" value={subcategory} id="subcategory">
            {cat.subcategories.map((s) => (
              <Chip key={s} label={s} active={subcategory === s}
                onPress={() => { setSubcategory(subcategory === s ? '' : s); }} />
            ))}
          </Section>
        )}

        <Section label="AI Tool" value={tool} id="tool">
          {taxonomy?.tools.map((t) => (
            <Chip key={t} label={t} active={tool === t}
              onPress={() => setTool(tool === t ? '' : t)} />
          ))}
        </Section>

        <Section label="Difficulty" value={difficulty} id="difficulty">
          {taxonomy?.difficulties.map((d) => (
            <Chip key={d} label={d} active={difficulty === d} onPress={() => setDifficulty(d)} />
          ))}
        </Section>

        <Section label="Content Type" value={contentType} id="contentType">
          {taxonomy?.content_types.map((ct) => (
            <Chip key={ct} label={ct} active={contentType === ct} onPress={() => setContentType(ct)} />
          ))}
        </Section>

        <TouchableOpacity
          style={[styles.submitBtn, !canSubmit && styles.submitDisabled]}
          onPress={submit}
          disabled={!canSubmit || saving}
          testID="publish-btn"
        >
          {saving ? <ActivityIndicator color="#2A1400" /> : <Text style={styles.submitText}>🚀 Publish Prompt</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.md, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  cancel: { color: COLORS.textSecondary, fontSize: 15, fontWeight: '600' },
  headerTitle: { color: COLORS.white, fontSize: 17, fontWeight: '800' },
  label: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  input: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border,
    color: COLORS.white, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15.5,
  },
  textarea: { minHeight: 150 },
  counter: { color: COLORS.textMuted, fontSize: 11, textAlign: 'right', marginTop: 4 },
  field: { marginTop: 16, backgroundColor: COLORS.card, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  fieldHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
  fieldLabel: { color: COLORS.white, fontSize: 14.5, fontWeight: '700' },
  fieldValue: { color: COLORS.gold, fontSize: 13.5, fontWeight: '600', maxWidth: 200 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 14, paddingTop: 0 },
  submitBtn: {
    backgroundColor: COLORS.gold, borderRadius: RADIUS.lg, paddingVertical: 16,
    alignItems: 'center', marginTop: 28,
  },
  submitDisabled: { opacity: 0.4 },
  submitText: { color: '#2A1400', fontWeight: '900', fontSize: 16 },
});
