import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Platform, Linking, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { api, PackageInfo } from '../utils/api';
import { COLORS, SPACING, RADIUS } from '../constants/theme';
import { useApp } from '../context/AppContext';

const PENDING_KEY = 'promptveer_pending_checkout';

export default function Upgrade() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { ensureSession } = useApp();
  const [packages, setPackages] = useState<PackageInfo[]>([]);
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string>('pro_monthly');
  const [busy, setBusy] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCount = useRef(0);

  useEffect(() => {
    (async () => {
      try {
        const r = await api.getPackages();
        setPackages(r.packages);
        setEnabled(r.enabled);
      } catch {}
      finally { setLoading(false); }
    })();
    // Resume a pending web checkout after redirect back
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const pending = localStorage.getItem(PENDING_KEY);
      if (pending) { localStorage.removeItem(PENDING_KEY); startPolling(pending); }
    }
    return () => { if (pollTimer.current) clearInterval(pollTimer.current); };
  }, []);

  const startPolling = (sessionId: string) => {
    setStatusMsg('Confirming your payment…');
    pollCount.current = 0;
    if (pollTimer.current) clearInterval(pollTimer.current);
    pollTimer.current = setInterval(async () => {
      pollCount.current += 1;
      if (pollCount.current > 15) {
        if (pollTimer.current) clearInterval(pollTimer.current);
        setStatusMsg('Still processing. Check back shortly.');
        return;
      }
      try {
        const s = await api.getPaymentStatus(sessionId);
        if (s.paid) {
          if (pollTimer.current) clearInterval(pollTimer.current);
          setStatusMsg('');
          Alert.alert('🎉 Payment successful!', 'Thank you for supporting PromptVeer. (Everything stays free for now!)');
        } else if (s.status === 'expired') {
          if (pollTimer.current) clearInterval(pollTimer.current);
          setStatusMsg('Checkout expired.');
        }
      } catch {}
    }, 2500);
  };

  const onCheckout = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await ensureSession();
      const origin = Platform.OS === 'web' && typeof window !== 'undefined'
        ? window.location.origin
        : (process.env.EXPO_PUBLIC_BACKEND_URL || '');
      const r = await api.createCheckout(selected, origin);
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        localStorage.setItem(PENDING_KEY, r.session_id);
        window.location.assign(r.url);
      } else {
        await Linking.openURL(r.url);
        startPolling(r.session_id);
      }
    } catch (e: any) {
      const msg = String(e?.message || '');
      if (msg.includes('503')) {
        Alert.alert('Coming soon', 'Payments will be enabled once the app is published. The full checkout flow is already built and ready.');
      } else {
        Alert.alert('Error', 'Could not start checkout. Please try again.');
      }
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color={COLORS.gold} size="large" /></View>;

  return (
    <View style={styles.container}>
      <View style={[styles.top, { paddingTop: insets.top + 6 }]}>
        <Pressable onPress={() => router.back()} hitSlop={10}><Text style={styles.close}>✕</Text></Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: SPACING.md, paddingBottom: insets.bottom + 120 }} showsVerticalScrollIndicator={false}>
        <Text style={styles.badge}>👑 PROMPTVEER PRO</Text>
        <Text style={styles.title}>Support the arena</Text>
        <Text style={styles.subtitle}>
          Every prompt is 100% free right now. Pro exists to back the project — premium bundles unlock here later.
        </Text>

        {!enabled && (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>ℹ️ Checkout activates after the app is published.</Text>
          </View>
        )}

        {packages.map((p) => {
          const active = selected === p.id;
          return (
            <Pressable key={p.id} style={[styles.pkg, active && styles.pkgActive]} onPress={() => setSelected(p.id)} testID={`pkg-${p.id}`}>
              <View style={styles.pkgHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.pkgName}>{p.name}</Text>
                  <Text style={styles.pkgTagline}>{p.tagline}</Text>
                </View>
                <Text style={styles.pkgPrice}>${p.amount.toFixed(2)}</Text>
              </View>
              <View style={styles.perks}>
                {p.perks.map((perk) => (
                  <Text key={perk} style={styles.perk}>✓ {perk}</Text>
                ))}
              </View>
            </Pressable>
          );
        })}

        {statusMsg ? <Text style={styles.statusMsg}>{statusMsg}</Text> : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <Pressable style={styles.checkoutBtn} onPress={onCheckout} disabled={busy} testID="checkout-btn">
          {busy ? <ActivityIndicator color="#2A1400" /> : <Text style={styles.checkoutText}>Continue</Text>}
        </Pressable>
        <Text style={styles.secure}>🔒 Secure checkout by Stripe</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' },
  top: { paddingHorizontal: SPACING.md, paddingBottom: 4 },
  close: { color: COLORS.white, fontSize: 22, fontWeight: '700' },
  badge: { color: COLORS.gold, fontWeight: '900', fontSize: 12.5, letterSpacing: 1.5 },
  title: { color: COLORS.white, fontSize: 28, fontWeight: '900', marginTop: 8 },
  subtitle: { color: COLORS.textSecondary, fontSize: 14.5, lineHeight: 21, marginTop: 8, marginBottom: 20 },
  notice: { backgroundColor: COLORS.purpleGlow, borderRadius: RADIUS.md, padding: 12, marginBottom: 16 },
  noticeText: { color: COLORS.purpleLight, fontSize: 13, fontWeight: '600' },
  pkg: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.border,
    padding: SPACING.md, marginBottom: 12,
  },
  pkgActive: { borderColor: COLORS.gold, backgroundColor: COLORS.cardAlt },
  pkgHeader: { flexDirection: 'row', alignItems: 'center' },
  pkgName: { color: COLORS.white, fontSize: 17, fontWeight: '800' },
  pkgTagline: { color: COLORS.textSecondary, fontSize: 12.5, marginTop: 2 },
  pkgPrice: { color: COLORS.gold, fontSize: 22, fontWeight: '900' },
  perks: { marginTop: 12, gap: 5 },
  perk: { color: COLORS.text, fontSize: 13.5 },
  statusMsg: { color: COLORS.gold, textAlign: 'center', marginTop: 16, fontWeight: '600' },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: SPACING.md, paddingTop: 12,
    backgroundColor: COLORS.backgroundAlt, borderTopWidth: 1, borderTopColor: COLORS.border, gap: 8,
  },
  checkoutBtn: { backgroundColor: COLORS.gold, borderRadius: RADIUS.lg, paddingVertical: 16, alignItems: 'center' },
  checkoutText: { color: '#2A1400', fontWeight: '900', fontSize: 16 },
  secure: { color: COLORS.textMuted, fontSize: 12, textAlign: 'center' },
});
