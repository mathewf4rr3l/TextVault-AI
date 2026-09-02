import React, { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  Animated, Vibration, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { api } from '../utils/api';
import { useApp } from '../context/AppContext';
import { COLORS, SPACING } from '../constants/theme';

const PIN_LENGTH = 4;
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];

export default function SetupPinScreen() {
  const [step, setStep] = useState<1 | 2>(1);
  const [firstPin, setFirstPin] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const { setUnlocked } = useApp();
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const shake = () => {
    Vibration.vibrate([0, 60, 60, 60]);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 12, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -12, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleDigit = async (digit: string) => {
    if (saving || pin.length >= PIN_LENGTH) return;
    const newPin = pin + digit;
    setPin(newPin);
    setError('');

    if (newPin.length === PIN_LENGTH) {
      if (step === 1) {
        setFirstPin(newPin);
        setStep(2);
        setTimeout(() => setPin(''), 300);
      } else {
        if (newPin === firstPin) {
          setSaving(true);
          try {
            await api.setupPin(newPin);
            try {
              await SecureStore.setItemAsync('vault_pin', newPin);
            } catch {
              // SecureStore not available on web, ignore
            }
            setUnlocked(true);
            router.replace('/(vault)/home');
          } catch {
            Alert.alert('Error', 'Could not save PIN. Check your connection.');
            setSaving(false);
            setPin('');
          }
        } else {
          setError("PINs don't match. Try again.");
          shake();
          setStep(1);
          setFirstPin('');
          setTimeout(() => setPin(''), 400);
        }
      }
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setError('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.lockIcon}>🛡️</Text>
        <Text style={styles.title}>
          {step === 1 ? 'Create Your PIN' : 'Confirm Your PIN'}
        </Text>
        <Text style={styles.subtitle}>
          {step === 1
            ? 'Set a 4-digit PIN to protect your vault'
            : 'Enter the same PIN again to confirm'}
        </Text>
      </View>

      <View style={styles.stepsContainer}>
        <View style={[styles.stepDot, { backgroundColor: COLORS.gold }]} />
        <View style={[styles.stepLine, step === 2 && styles.stepLineDone]} />
        <View style={[styles.stepDot, step === 2 && { backgroundColor: COLORS.gold }]} />
      </View>

      <Animated.View style={[styles.dotsContainer, { transform: [{ translateX: shakeAnim }] }]}>
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i < pin.length ? styles.dotFilled : styles.dotEmpty,
            ]}
          />
        ))}
      </Animated.View>

      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : (
        <View style={{ height: 20 }} />
      )}

      {saving ? (
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
                testID={`setup-pin-key-${key === '⌫' ? 'delete' : key}`}
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
  header: { alignItems: 'center', gap: 12, paddingHorizontal: 32 },
  lockIcon: { fontSize: 60 },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  stepsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  stepLine: {
    width: 60,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 8,
  },
  stepLineDone: { backgroundColor: COLORS.gold },
  dotsContainer: { flexDirection: 'row', gap: 20 },
  dot: { width: 16, height: 16, borderRadius: 8 },
  dotFilled: { backgroundColor: COLORS.gold },
  dotEmpty: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
  },
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
