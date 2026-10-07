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

export type ReminderStatus = 'on' | 'off' | 'ask';

/** 'ask' = iOS hasn't shown the permission prompt yet. */
export async function reminderStatus(): Promise<ReminderStatus> {
  if (Platform.OS === 'web') return 'off';
  try {
    const p = await Notifications.getPermissionsAsync();
    if (p.granted || p.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) return 'on';
    return p.canAskAgain ? 'ask' : 'off';
  } catch {
    return 'off';
  }
}

/** Shows the iOS prompt if it hasn't been shown yet. Never caches a "no", so a later yes in Settings is picked up. */
export async function ensurePermission(): Promise<boolean> {
  const status = await reminderStatus();
  if (status === 'on') return true;
  if (status === 'off') return false;
  try {
    const asked = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowSound: true, allowBadge: false },
    });
    return asked.granted;
  } catch (e) {
    console.warn('Notification permission request failed', e);
    return false;
  }
}

export async function scheduleReminder(stub: Stub): Promise<string | undefined> {
  if (Platform.OS === 'web') return undefined;
  const at = reminderDate(stub);
  if (at.getTime() <= Date.now() + 30_000) return undefined;
  if (!(await ensurePermission())) return undefined;

  const count = stub.tickets.length;
  try {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: stub.time ? `${stub.title} at ${stub.time}` : `Today: ${stub.title}`,
        body: count > 1 ? `Tap to open your ${count} tickets.` : 'Tap to open your ticket.',
        data: { stubId: stub.id },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at },
    });
  } catch (e) {
    console.warn('Could not schedule reminder', e);
    return undefined;
  }
}

export async function cancelReminder(id?: string) {
  if (!id || Platform.OS === 'web') return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // Already fired or never existed.
  }
}
