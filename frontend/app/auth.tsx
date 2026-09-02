import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  ActivityIndicator, Platform, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import * as SecureStore from 'expo-secure-store';
import { api } from '../utils/api';
import { useApp } from '../context/AppContext';
import { COLORS, SPACING, RADIUS } from '../constants/theme';

WebBrowser.maybeCompleteAuthSession();

function extractSessionId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/[#?&]session_id=([^&#]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

async function getOrCreateDeviceId(): Promise<string> {
  const DEVICE_KEY = 'textvault_device_id';
  try {
    if (Platform.OS === 'web') {
      if (typeof window === 'undefined') return 'web_' + Date.now();
      const stored = localStorage.getItem(DEVICE_KEY);
      if (stored) return stored;
      const newId = 'web_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
      localStorage.setItem(DEVICE_KEY, newId);
      return newId;
    }
    const stored = await SecureStore.getItemAsync(DEVICE_KEY);
    if (stored) return stored;
    const newId = 'dev_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
    await SecureStore.setItemAsync(DEVICE_KEY, newId);
    return newId;
  } catch {
    return 'fallback_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
  }
}

export default function AuthScreen() {
  const [loading, setLoading] = useState(false);
  const [skipLoading, setSkipLoading] = useState(false);
  const { login } = useApp();
  const router = useRouter();

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      if (Platform.OS === 'web') {
        const redirectUrl = window.location.origin + '/';
        const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
        window.location.href = authUrl;
        return;
      }

      // Mobile: register listener BEFORE opening browser
      const redirectUrl = Linking.createURL('');
      const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;

      let capturedUrl: string | null = null;
      const subscription = Linking.addEventListener('url', ({ url }) => {
        capturedUrl = url;
      });

      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
      subscription.remove();

      // Try all three sources for session_id
      let sessionId: string | null = null;

      if ((result as any).url) {
        sessionId = extractSessionId((result as any).url);
      }
      if (!sessionId && capturedUrl) {
        sessionId = extractSessionId(capturedUrl);
      }
      if (!sessionId) {
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl) sessionId = extractSessionId(initialUrl);
      }

      if (sessionId) {
        const data = await api.exchangeSession(sessionId);
        await login(data.session_token, data.user);
        router.replace('/');
      } else if (result.type !== 'dismiss' && result.type !== 'cancel') {
        Alert.alert('Sign In Failed', 'Could not complete sign in. Please try again.');
      }
    } catch (e) {
      Alert.alert('Error', 'Sign in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSkipToPin = async () => {
    setSkipLoading(true);
    try {
      const deviceId = await getOrCreateDeviceId();
      const data = await api.createGuestSession(deviceId);
      await login(data.session_token, data.user);
      router.replace('/');
    } catch (e) {
      Alert.alert('Error', 'Could not initialize vault. Please check your connection and try again.');
    } finally {
      setSkipLoading(false);
    }
  };

  const isAnyLoading = loading || skipLoading;

  return (
    <SafeAreaView style={styles.container} testID="auth-screen">
      {/* Hero section */}
      <View style={styles.hero}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoEmoji}>🔐</Text>
        </View>
        <Text style={styles.title}>TextVault AI</Text>
        <Text style={styles.tagline}>Your secure, intelligent text vault</Text>

        <View style={styles.featureList}>
          {[
            { icon: '🤖', text: 'AI auto-categorizes every entry' },
            { icon: '🔒', text: 'PIN-protected private vault' },
            { icon: '⚡', text: 'Instant search & smart retrieval' },
          ].map((f) => (
            <View key={f.text} style={styles.featureRow}>
              <Text style={styles.featureIcon}>{f.icon}</Text>
              <Text style={styles.featureText}>{f.text}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Auth actions */}
      <View style={styles.actions}>
        {isAnyLoading ? (
          <View style={styles.loadingBox} testID="auth-loading">
            <ActivityIndicator color={COLORS.gold} size="large" />
            <Text style={styles.loadingText}>
              {loading
                ? Platform.OS === 'web' ? 'Redirecting to Google…' : 'Opening Google Sign-In…'
                : 'Setting up your vault…'}
            </Text>
          </View>
        ) : (
          <>
            <TouchableOpacity
              style={styles.googleBtn}
              onPress={handleGoogleLogin}
              testID="google-signin-btn"
              activeOpacity={0.88}
            >
              <View style={styles.googleIconCircle}>
                <Text style={styles.googleLetter}>G</Text>
              </View>
              <Text style={styles.googleBtnText}>Continue with Google</Text>
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={styles.pinOnlyBtn}
              onPress={handleSkipToPin}
              testID="pin-only-btn"
              activeOpacity={0.8}
            >
              <Text style={styles.pinOnlyBtnText}>🔑  Continue with PIN only</Text>
            </TouchableOpacity>
          </>
        )}

        <Text style={styles.privacyNote}>
          🛡️ Your data is encrypted & never shared
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'space-between',
  },
  hero: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    gap: 16,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 28,
    backgroundColor: 'rgba(242, 169, 0, 0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(242, 169, 0, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  logoEmoji: { fontSize: 52 },
  title: {
    fontSize: 38,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 17,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  featureList: {
    marginTop: 24,
    gap: 14,
    width: '100%',
    paddingHorizontal: 8,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  featureIcon: { fontSize: 22 },
  featureText: { fontSize: 15, color: COLORS.white, fontWeight: '500', flex: 1 },
  actions: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: 48,
    gap: 16,
  },
  loadingBox: { alignItems: 'center', gap: 14, paddingVertical: 20 },
  loadingText: { color: COLORS.textSecondary, fontSize: 15 },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    backgroundColor: '#FFFFFF',
    paddingVertical: 17,
    borderRadius: RADIUS.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  googleIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#4285F4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleLetter: { fontSize: 16, fontWeight: '900', color: '#FFF' },
  googleBtnText: { fontSize: 17, fontWeight: '700', color: '#111827' },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  dividerText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  pinOnlyBtn: {
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: RADIUS.lg,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  pinOnlyBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
    letterSpacing: 0.2,
  },
  privacyNote: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
});
