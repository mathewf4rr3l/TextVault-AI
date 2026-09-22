import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Platform, Alert, Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { api } from '../utils/api';
import { useApp } from '../context/AppContext';
import { COLORS, SPACING, RADIUS } from '../constants/theme';

WebBrowser.maybeCompleteAuthSession();

function extractSessionId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/[#?&]session_id=([^&#]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export default function SignIn() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const { login } = useApp();
  const router = useRouter();

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      if (Platform.OS === 'web') {
        const redirectUrl = window.location.origin + '/';
        window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
        return;
      }
      const redirectUrl = Linking.createURL('');
      const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
      let capturedUrl: string | null = null;
      const subscription = Linking.addEventListener('url', ({ url }) => { capturedUrl = url; });
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
      subscription.remove();

      let sessionId: string | null = null;
      if ((result as any).url) sessionId = extractSessionId((result as any).url);
      if (!sessionId && capturedUrl) sessionId = extractSessionId(capturedUrl);
      if (!sessionId) {
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl) sessionId = extractSessionId(initialUrl);
      }
      if (sessionId) {
        const data = await api.exchangeSession(sessionId);
        await login(data.session_token, data.user);
        router.back();
      } else if (result.type !== 'dismiss' && result.type !== 'cancel') {
        Alert.alert('Sign In Failed', 'Could not complete sign in. Please try again.');
      }
    } catch {
      Alert.alert('Error', 'Sign in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.top, { paddingTop: insets.top + 6 }]}>
        <Pressable onPress={() => router.back()} hitSlop={10}><Text style={styles.close}>✕</Text></Pressable>
      </View>

      <View style={styles.hero}>
        <View style={styles.logoBox}><Text style={styles.logoEmoji}>⚔️</Text></View>
        <Text style={styles.title}>Join PromptVeer</Text>
        <Text style={styles.tagline}>Sign in to save your rank across devices and keep climbing the warrior ladder.</Text>

        <View style={styles.features}>
          {[
            { icon: '🏆', text: 'Keep your rank & medals forever' },
            { icon: '📤', text: 'Get credit for every prompt you share' },
            { icon: '❤️', text: 'Sync your liked prompts everywhere' },
          ].map((f) => (
            <View key={f.text} style={styles.featureRow}>
              <Text style={styles.featureIcon}>{f.icon}</Text>
              <Text style={styles.featureText}>{f.text}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={[styles.actions, { paddingBottom: insets.bottom + 24 }]}>
        {loading ? (
          <ActivityIndicator color={COLORS.gold} size="large" />
        ) : (
          <TouchableOpacity style={styles.googleBtn} onPress={handleGoogleLogin}>
            <View style={styles.googleIcon}><Text style={styles.googleLetter}>G</Text></View>
            <Text style={styles.googleText}>Continue with Google</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.note}>You can keep browsing as a guest anytime.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'space-between' },
  top: { paddingHorizontal: SPACING.md },
  close: { color: COLORS.white, fontSize: 22, fontWeight: '700' },
  hero: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: SPACING.xl, gap: 14 },
  logoBox: {
    width: 92, height: 92, borderRadius: 26, backgroundColor: COLORS.purpleGlow,
    borderWidth: 1.5, borderColor: COLORS.purpleLight, justifyContent: 'center', alignItems: 'center',
  },
  logoEmoji: { fontSize: 46 },
  title: { fontSize: 30, fontWeight: '900', color: COLORS.white },
  tagline: { fontSize: 15, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 21 },
  features: { marginTop: 20, gap: 12, width: '100%' },
  featureRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: COLORS.card,
    borderRadius: RADIUS.md, paddingVertical: 14, paddingHorizontal: 16, borderWidth: 1, borderColor: COLORS.border,
  },
  featureIcon: { fontSize: 20 },
  featureText: { color: COLORS.white, fontSize: 14.5, fontWeight: '600', flex: 1 },
  actions: { paddingHorizontal: SPACING.lg, gap: 16 },
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14,
    backgroundColor: '#FFFFFF', paddingVertical: 16, borderRadius: RADIUS.lg,
  },
  googleIcon: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#4285F4', justifyContent: 'center', alignItems: 'center' },
  googleLetter: { fontSize: 15, fontWeight: '900', color: '#FFF' },
  googleText: { fontSize: 16.5, fontWeight: '700', color: '#111827' },
  note: { textAlign: 'center', color: COLORS.textMuted, fontSize: 13 },
});
