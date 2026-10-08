import * as Updates from 'expo-updates';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { showToast } from '../components/Toast';

/**
 * Over-the-air updates: checks when Stubs opens or comes back to the front, downloads quietly,
 * then offers a one-tap restart. If ignored, the update applies on the next launch anyway.
 */
export function useOtaUpdates() {
  useEffect(() => {
    if (__DEV__ || !Updates.isEnabled) return;
    let busy = false;

    const check = async () => {
      if (busy) return;
      busy = true;
      try {
        const res = await Updates.checkForUpdateAsync();
        if (!res.isAvailable) return;
        const fetched = await Updates.fetchUpdateAsync();
        if (fetched.isNew) {
          showToast('Stash update ready', { label: 'Restart', onPress: () => Updates.reloadAsync() }, { sticky: true });
        }
      } catch {
        // Offline or server busy: try again next time.
      } finally {
        busy = false;
      }
    };

    check();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && check());
    return () => sub.remove();
  }, []);
}
