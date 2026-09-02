import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { AppProvider } from '../context/AppContext';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0A0A0C' } }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="lock" />
          <Stack.Screen name="setup-pin" />
          <Stack.Screen name="(vault)" />
          <Stack.Screen name="add" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
          <Stack.Screen name="detail/[id]" options={{ animation: 'slide_from_right' }} />
        </Stack>
      </AppProvider>
    </GestureHandlerRootView>
  );
}
