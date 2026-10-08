import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { AppState, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../components/Icon';
import { RoundButton } from '../components/RoundButton';
import { enableScreenshotCheck, screenshotsSupported } from '../lib/screenshots';
import { reminderStatus, type ReminderStatus } from '../lib/reminders';
import { ensureReminders, setSettings, useStore } from '../lib/store';
import { colors, fonts, label } from '../theme';

const KEEP = [
  { days: 7, label: '1 week' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
  { days: 0, label: 'Forever' },
];

export default function Settings() {
  const keep = useStore((s) => s.settings.keepPastDays);
  const count = useStore((s) => s.stubs.length);
  const [reminders, setReminders] = useState<ReminderStatus | null>(null);
  useFocusEffect(
    useCallback(() => {
      reminderStatus().then(setReminders);
      const sub = AppState.addEventListener('change', (st) => st === 'active' && reminderStatus().then(setReminders));
      return () => sub.remove();
    }, []),
  );
  const lockScreen = useStore((s) => s.settings.lockScreen);
  const shots = useStore((s) => s.settings.screenshots);
  const insets = useSafeAreaInsets();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
      <View style={styles.bar}>
        <Text style={styles.title}>Settings</Text>
        <RoundButton label="Close" onPress={() => router.back()} size={40} color={colors.paper}>
          <Icon name="close" size={18} color={colors.ink} />
        </RoundButton>
      </View>

      <View style={styles.block}>
        <Text style={label}>Keep past tickets</Text>
        <View style={styles.chips}>
          {KEEP.map((k) => {
            const on = k.days === keep;
            return (
              <Pressable
                key={k.days}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                onPress={() => setSettings({ keepPastDays: k.days })}
                style={[styles.chip, on && styles.chipOn]}
              >
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{k.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.note}>
          {keep ? `Tickets delete themselves ${keep} days after the event.` : 'Old tickets stay until you clear them.'}
        </Text>
      </View>

      <View style={styles.block}>
        <Text style={label}>Shortcuts</Text>
        <View style={styles.row}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.rowText}>Lock screen ticket</Text>
            <Text style={styles.note}>On the day, pin the ticket to your lock screen.</Text>
          </View>
          <Switch
            value={lockScreen}
            onValueChange={(v) => setSettings({ lockScreen: v })}
            trackColor={{ true: colors.accent, false: '#D6D6CF' }}
            accessibilityLabel="Lock screen ticket"
          />
        </View>
        {screenshotsSupported && (
          <View style={styles.row}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.rowText}>Spot tickets in screenshots</Text>
              <Text style={styles.note}>Checked on this phone when you open Stash.</Text>
            </View>
            <Switch
              value={shots === 'on'}
              onValueChange={(v) => {
                if (v) enableScreenshotCheck();
                else setSettings({ screenshots: 'off' });
              }}
              trackColor={{ true: colors.accent, false: '#D6D6CF' }}
              accessibilityLabel="Spot tickets in screenshots"
            />
          </View>
        )}
      </View>

      <View style={styles.block}>
        <Text style={label}>Reminders</Text>
        <Text style={styles.body}>
          8am on the day, or 2 hours before if the ticket has a time. Tap the notification to jump straight to the code.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={async () => {
            if (reminders === 'ask') {
              await ensureReminders(true);
              setReminders(await reminderStatus());
            } else {
              Linking.openSettings();
            }
          }}
          style={styles.row}
        >
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.rowText}>
              {reminders === 'on' ? 'Reminders are on' : reminders === 'ask' ? 'Turn on reminders' : 'Reminders are off'}
            </Text>
            <Text style={styles.note}>
              {reminders === 'off' ? 'Tap to allow notifications in iPhone Settings.' : reminders === 'on' ? 'Tip: set Banner Style to Persistent so they stay on screen' : 'Stash needs permission to remind you.'}
            </Text>
          </View>
          <Icon name="arrow" size={16} color={colors.ink} />
        </Pressable>
      </View>

      <View style={styles.block}>
        <Text style={label}>Privacy</Text>
        <Text style={styles.body}>
          Your tickets never leave this phone unless you send them. No account, no server. Codes are read on-device.
        </Text>
      </View>

      <Text style={styles.footer}>
        Stash {Constants.expoConfig?.version ?? ''} · {count} ticket{count === 1 ? '' : 's'} stored
      </Text>
      <Text style={styles.footer}>
        {Updates.isEnabled && Updates.updateId && !Updates.isEmbeddedLaunch
          ? `Update ${Updates.updateId.slice(0, 8)} · ${Updates.createdAt ? Updates.createdAt.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}`
          : 'Built-in version (no updates applied yet)'}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ground },
  content: { padding: 20, gap: 28 },
  bar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontFamily: fonts.display, fontSize: 40, textTransform: 'uppercase', color: colors.ink },
  block: { gap: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1.5, borderColor: colors.ink, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 },
  chipOn: { backgroundColor: colors.ink },
  chipText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.ink },
  chipTextOn: { color: colors.accent },
  note: { fontFamily: fonts.mono, fontSize: 12, color: colors.inkSoft },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 23, color: colors.ink },
  row: {
    minHeight: 52,
    backgroundColor: colors.paper,
    borderRadius: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.ink },
  footer: { fontFamily: fonts.mono, fontSize: 12, color: colors.inkSoft, textAlign: 'center' },
});
