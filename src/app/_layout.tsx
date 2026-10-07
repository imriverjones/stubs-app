import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import { SpaceMono_400Regular, SpaceMono_700Bold } from '@expo-google-fonts/space-mono';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import { router, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ToastHost } from '../components/Toast';
import { configureNotifications } from '../lib/reminders';
import { cleanUp, load, useStore } from '../lib/store';
import { colors } from '../theme';

SplashScreen.preventAutoHideAsync().catch(() => {});
configureNotifications();

/** Opens the ticket when someone taps a day-of reminder (cold start or running). */
function useReminderTaps(ready: boolean) {
  const last = Notifications.useLastNotificationResponse();
  useEffect(() => {
    if (!ready || !last || Platform.OS === 'web') return;
    const id = last.notification.request.content.data?.stubId;
    if (typeof id === 'string') {
      router.push({ pathname: '/ticket/[id]', params: { id } });
      Notifications.clearLastNotificationResponse();
    }
  }, [ready, last]);
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    StubsDisplay: require('../../assets/fonts/StubsDisplay.ttf'),
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_700Bold,
    SpaceMono_400Regular,
    SpaceMono_700Bold,
  });
  const loaded = useStore((s) => s.loaded);
  const ready = fontsLoaded && loaded;

  useEffect(() => {
    load();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && cleanUp());
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  useReminderTaps(ready);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.ground }}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.ground } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="ticket/[id]" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="add" options={{ presentation: 'modal' }} />
        <Stack.Screen name="edit/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="original/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
        <Stack.Screen name="handle-share" options={{ animation: 'fade' }} />
      </Stack>
      <ToastHost />
    </GestureHandlerRootView>
  );
}
