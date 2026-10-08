import { Alert, Linking } from 'react-native';

/**
 * iOS doesn't let apps make their own banners persistent: it's the person's choice in
 * Settings → Notifications → Stash → Banner Style (and Show Previews). This walks them there.
 */
export function askPersistentBanners() {
  Alert.alert(
    'Keep reminders on screen',
    'iPhone lets you choose this, not apps:\n\n1. Tap Open Settings\n2. Tap Notifications\n3. Set Banner Style to Persistent\n4. Set Show Previews to Always\n\nStash reminders will then stay on screen until you swipe them away, with the ticket details showing even when your phone is locked.',
    [
      { text: 'Not now', style: 'cancel' },
      { text: 'Open Settings', onPress: () => Linking.openSettings() },
    ],
  );
}
