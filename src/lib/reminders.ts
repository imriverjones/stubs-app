import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { toDate } from './dates';
import type { Stub } from './types';

/** Without a time: 8am on the day. With a time: 2 hours before. */
export function reminderDate(stub: Pick<Stub, 'date' | 'time'>): Date {
  if (stub.time) {
    const at = toDate(stub.date, stub.time);
    at.setHours(at.getHours() - 2);
    return at;
  }
  return toDate(stub.date, '08:00');
}

export function configureNotifications() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

let permission: boolean | null = null;

export async function ensurePermission(): Promise<boolean> {
  if (permission != null) return permission;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return (permission = true);
  if (!current.canAskAgain) return (permission = false);
  const asked = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: true, allowBadge: false },
  });
  return (permission = asked.granted);
}

export async function scheduleReminder(stub: Stub): Promise<string | undefined> {
  if (Platform.OS === 'web') return undefined;
  const at = reminderDate(stub);
  if (at.getTime() <= Date.now() + 30_000) return undefined;
  if (!(await ensurePermission())) return undefined;

  const count = stub.tickets.length;
  return Notifications.scheduleNotificationAsync({
    content: {
      title: stub.time ? `${stub.title} at ${stub.time}` : `Today: ${stub.title}`,
      body: count > 1 ? `Tap to open your ${count} tickets.` : 'Tap to open your ticket.',
      data: { stubId: stub.id },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at },
  });
}

export async function cancelReminder(id?: string) {
  if (!id || Platform.OS === 'web') return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // Already fired or never existed.
  }
}
