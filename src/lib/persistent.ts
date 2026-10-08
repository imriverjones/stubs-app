import { Alert, Linking } from 'react-native';

/**
 * iOS doesn't let apps make their own banners persistent: it's the person's choice in
 * Settings → Notifications → Stash → Banner Style. This walks them there.
 */
export function askPersistentBanners() {
  Alert.alert(
    'Keep reminders on screen',
    'iPhone lets you choose this, not apps:\n\n1. Tap Open Settings\n2. Tap Notifications\n3. Set Banner Style to Persistent\n\nStash reminders will then stay at the top of your screen until you swipe them away.',
    [
      { text: 'Not now', style: 'cancel' },
      { text: 'Open Settings', onPress: () => Linking.openSettings() },
    ],
  );
}
