import React, { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  Animated, Vibration, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { api } from '../utils/api';
import { useApp } from '../context/AppContext';
import { COLORS, SPACING } from '../constants/theme';

const PIN_LENGTH = 4;
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];

export default function LockScreen() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { setUnlocked } = useApp();
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const shake = () => {
    Vibration.vibrate([0, 50, 50, 50]);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 12, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -12, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleDigit = async (digit: string) => {
    if (loading || pin.length >= PIN_LENGTH) return;
    const newPin = pin + digit;
    setPin(newPin);
    setError(false);

    if (newPin.length === PIN_LENGTH) {
      setLoading(true);
      try {
        // Try SecureStore (may not be available on web)
        let stored: string | null = null;
        try {
          stored = await SecureStore.getItemAsync('vault_pin');
        } catch {
          // SecureStore not available on web, skip to backend
        }
        if (stored && stored === newPin) {
          setUnlocked(true);
          router.replace('/(vault)/home');
          return;
        }
        // Fallback to backend verification
        const result = await api.verifyPin(newPin);
        if (result.success) {
          try {
            await SecureStore.setItemAsync('vault_pin', newPin);
          } catch {
            // SecureStore not available on web, ignore
          }
          setUnlocked(true);
          router.replace('/(vault)/home');
        } else {
          setError(true);
          shake();
          setTimeout(() => { setPin(''); setLoading(false); }, 700);
        }
      } catch {
        setError(true);
        shake();
        setTimeout(() => { setPin(''); setLoading(false); }, 700);
      }
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.lockIcon}>🔐</Text>
        <Text style={styles.title}>TextVault</Text>
        <Text style={styles.subtitle}>Enter your PIN to unlock</Text>
      </View>

      <Animated.View style={[styles.dotsContainer, { transform: [{ translateX: shakeAnim }] }]}>
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i < pin.length ? styles.dotFilled : styles.dotEmpty,
              error && styles.dotError,
            ]}
          />
        ))}
      </Animated.View>

      {error && <Text style={styles.errorText}>Incorrect PIN. Try again.</Text>}
      {!error && <View style={{ height: 20 }} />}

      {loading ? (
        <ActivityIndicator color={COLORS.gold} size="large" style={{ marginVertical: 40 }} />
      ) : (
        <View style={styles.keypad}>
          {KEYS.map((key, i) => {
            if (key === '') return <View key={i} style={styles.keyPlaceholder} />;
            return (
              <TouchableOpacity
                key={i}
                style={[styles.key, key === '⌫' && styles.keyDelete]}
                onPress={() => (key === '⌫' ? handleDelete() : handleDigit(key))}
                testID={`pin-key-${key === '⌫' ? 'delete' : key}`}
                activeOpacity={0.7}
              >
                <Text style={[styles.keyText, key === '⌫' && styles.keyDeleteText]}>{key}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingVertical: 32,
  },
  header: { alignItems: 'center', gap: 10 },
  lockIcon: { fontSize: 60 },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: -0.8,
  },
  subtitle: { fontSize: 16, color: COLORS.textSecondary },
  dotsContainer: { flexDirection: 'row', gap: 20 },
  dot: { width: 16, height: 16, borderRadius: 8 },
  dotFilled: { backgroundColor: COLORS.gold },
  dotEmpty: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  dotError: { backgroundColor: COLORS.error },
  errorText: { color: COLORS.error, fontSize: 14, fontWeight: '600' },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 18,
    width: 290,
  },
  key: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(255,255,255,0.07)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  keyDelete: { backgroundColor: 'transparent', borderColor: 'transparent' },
  keyPlaceholder: { width: 76, height: 76 },
  keyText: { fontSize: 26, fontWeight: '500', color: COLORS.white },
  keyDeleteText: { color: COLORS.textSecondary, fontSize: 22 },
});
