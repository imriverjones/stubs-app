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
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ToastHost } from '../components/Toast';
import { backfillCovers } from '../lib/covers';
import { configureNotifications } from '../lib/reminders';
import { syncLockScreen } from '../lib/lockscreen';
import { checkRecentScreenshots } from '../lib/screenshots';
import { cleanUp, ensureReminders, load, useStore } from '../lib/store';
import { useOtaUpdates } from '../lib/useOtaUpdates';
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
  const [fontsLoaded, fontError] = useFonts({
    StubsDisplay: require('../../assets/fonts/StubsDisplay.ttf'),
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_700Bold,
    SpaceMono_400Regular,
    SpaceMono_700Bold,
  });
  const loaded = useStore((s) => s.loaded);
  const stubs = useStore((s) => s.stubs);
  const lockScreen = useStore((s) => s.settings.lockScreen);

  // Keep the lock screen card in step with today's tickets.
  useEffect(() => {
    if (loaded) syncLockScreen();
  }, [loaded, stubs, lockScreen]);
  // Never sit on the splash screen: if a font fails, carry on with system fonts.
  const ready = (fontsLoaded || !!fontError) && loaded;

  useEffect(() => {
    load().then(() => {
      ensureReminders();
      checkRecentScreenshots();
      backfillCovers();
    });
    const sub = AppState.addEventListener('change', (s) => {
      if (s !== 'active') return;
      cleanUp();
      ensureReminders();
      checkRecentScreenshots();
      syncLockScreen();
      backfillCovers();
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  useReminderTaps(ready);
  useOtaUpdates();

  if (!ready) return null;

  return (
    <SafeAreaProvider>
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.ground }}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.ground } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="ticket/[id]" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="add" options={{ presentation: 'modal' }} />
        <Stack.Screen name="edit/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="original/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
        <Stack.Screen name="handle-share" options={{ animation: 'fade' }} />
        <Stack.Screen name="web" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="paste" options={{ presentation: 'modal' }} />
        <Stack.Screen name="mail-help" options={{ presentation: 'modal' }} />
        <Stack.Screen name="intro" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
      </Stack>
      <ToastHost />
    </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
