import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { COLORS } from '../constants/theme';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    SecureStore.getItemAsync('vault_pin')
      .then((pin) => {
        if (pin) {
          router.replace('/lock');
        } else {
          router.replace('/setup-pin');
        }
      })
      .catch(() => router.replace('/setup-pin'));
  }, []);

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
