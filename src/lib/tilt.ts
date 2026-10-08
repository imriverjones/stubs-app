// Phone tilt as a shared 0…1 value for the holographic foil. Listens to the motion sensor only
// while at least one holographic card is on screen, and only on builds that have the sensor.
import { Animated } from 'react-native';
import { hasMotion } from './native';

export const tilt = new Animated.Value(0.5);
let users = 0;
let sub: { remove: () => void } | null = null;

export function startTilt(): (() => void) | null {
  if (!hasMotion) return null;
  users += 1;
  if (!sub) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- only on builds with the sensor
      const { DeviceMotion } = require('expo-sensors') as typeof import('expo-sensors');
      DeviceMotion.setUpdateInterval(40);
      sub = DeviceMotion.addListener((m) => {
        const r = m.rotation;
        if (!r) return;
        // Side-to-side tilt matters most, forward/back adds a little: about ±35° covers the band.
        const v = 0.5 + r.gamma / 1.2 + (r.beta - 0.7) / 3;
        tilt.setValue(Math.max(0, Math.min(1, v)));
      });
    } catch {
      users -= 1;
      return null;
    }
  }
  return () => {
    users -= 1;
    if (users <= 0 && sub) {
      sub.remove();
      sub = null;
      users = 0;
    }
  };
}
