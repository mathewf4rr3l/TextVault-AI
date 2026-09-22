import { useEffect, useRef } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, SPACING } from '../constants/theme';
import { useApp } from '../context/AppContext';

export default function Index() {
  const router = useRouter();
  const { isAuthLoading, sessionToken, ensureSession } = useApp();
  const navigated = useRef(false);

  useEffect(() => {
    if (isAuthLoading) return;
    if (navigated.current) return;
    navigated.current = true;

    const go = async () => {
      try {
        if (!sessionToken) await ensureSession();
      } catch {
        // Even if guest session fails, marketplace is browsable (public GET)
      }
      router.replace('/(tabs)/discover' as any);
    };
    go();
  }, [isAuthLoading, sessionToken]);

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>PromptVeer</Text>
      <Text style={styles.tagline}>The AI prompt arena ⚔️</Text>
      <ActivityIndicator color={COLORS.gold} size="large" style={{ marginTop: SPACING.lg }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: { fontSize: 34, fontWeight: '900', color: COLORS.white, letterSpacing: -0.5 },
  tagline: { fontSize: 15, color: COLORS.purpleLight, marginTop: 6 },
});
