import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { AppProvider } from '../context/AppContext';
import { COLORS } from '../constants/theme';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: COLORS.background } }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="prompt/[id]" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="submit" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
          <Stack.Screen name="sign-in" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        </Stack>
      </AppProvider>
    </GestureHandlerRootView>
  );
}
