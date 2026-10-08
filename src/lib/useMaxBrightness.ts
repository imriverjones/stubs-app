import * as Brightness from 'expo-brightness';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { AppState, Platform } from 'react-native';

/** Full brightness while a code is on screen, back to where it was on leaving. */
export function useMaxBrightness(enabled = true) {
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS === 'web' || !enabled) return;
      let previous: number | null = null;
      let active = true;

      const boost = async () => {
        try {
          if (previous == null) previous = await Brightness.getBrightnessAsync();
          if (active) await Brightness.setBrightnessAsync(1);
        } catch {
          // Brightness isn't available (simulator); the code still shows.
        }
      };
      const restore = async () => {
        try {
          if (Platform.OS === 'android') await Brightness.restoreSystemBrightnessAsync();
          else if (previous != null) await Brightness.setBrightnessAsync(previous);
        } catch {}
      };

      boost();
      const sub = AppState.addEventListener('change', (s) => (s === 'active' ? boost() : restore()));
      return () => {
        active = false;
        sub.remove();
        restore();
      };
    }, [enabled]),
  );
}
