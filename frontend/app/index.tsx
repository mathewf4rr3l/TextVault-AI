import { useEffect, useRef } from 'react';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { COLORS } from '../constants/theme';
import { useApp } from '../context/AppContext';

export default function Index() {
  const router = useRouter();
  const { isAuthLoading, sessionToken } = useApp();
  const navigated = useRef(false);

  useEffect(() => {
    if (isAuthLoading) return;
    if (navigated.current) return;

    const doNavigate = async () => {
      if (navigated.current) return;
      navigated.current = true;

      if (!sessionToken) {
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.location.href = '/auth';
        } else {
          router.replace('/auth' as any);
        }
        return;
      }

      try {
        let pin: string | null = null;
        if (Platform.OS !== 'web') {
          pin = await SecureStore.getItemAsync('vault_pin');
        } else if (typeof window !== 'undefined') {
          pin = localStorage.getItem('vault_pin');
        }
        const dest = pin ? '/lock' : '/setup-pin';
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.location.href = dest;
        } else {
          router.replace(dest as any);
        }
      } catch {
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.location.href = '/setup-pin';
        } else {
          router.replace('/setup-pin' as any);
        }
      }
    };

    doNavigate();
  }, [isAuthLoading, sessionToken]);

  return (
    <View style={styles.container}>
      <ActivityIndicator color={COLORS.gold} size="large" />
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
});
