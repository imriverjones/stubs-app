import DateTimePicker, { DateTimePickerAndroid, type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { dayKey, fmt, timeKey, toDate } from '../lib/dates';
import { reminderDate } from '../lib/reminders';
import { KINDS, type Kind, type Stub } from '../lib/types';
import { colors, fonts, label } from '../theme';
import { CodeView } from './CodeView';
import { Perforated } from './Perforated';

export type StubFields = Pick<Stub, 'title' | 'kind' | 'date' | 'time'>;

type Props = {
  heading: string;
  stub: Stub;
  saveLabel: string;
  onSave: (fields: StubFields) => void;
  onCancel: () => void;
};

function reminderText(date: string, time?: string) {
  const at = reminderDate({ date, time });
  if (at.getTime() < Date.now()) return 'No reminder: that time has already passed.';
  const day = dayKey(at) === date ? fmt.short(date) : fmt.short(dayKey(at));
  return `Reminder ${timeKey(at)} on ${day}${time ? ' (2h before)' : ''}`;
}

export function StubForm({ heading, stub, saveLabel, onSave, onCancel }: Props) {
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState(stub.title);
  const [kind, setKind] = useState<Kind>(stub.kind);
  const [date, setDate] = useState(stub.date);
  const [time, setTime] = useState<string | undefined>(stub.time);
  const first = stub.tickets[0];
  const count = stub.tickets.length;

  const onDate = (_: DateTimePickerEvent, d?: Date) => d && setDate(dayKey(d));
  const onTime = (_: DateTimePickerEvent, d?: Date) => d && setTime(timeKey(d));

  const openAndroid = (mode: 'date' | 'time') =>
    DateTimePickerAndroid.open({
      value: toDate(date, time ?? '09:00'),
      mode,
      is24Hour: true,
      onChange: mode === 'date' ? onDate : onTime,
    });

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" onPress={onCancel} hitSlop={12} style={styles.topBtn}>
          <Text style={styles.cancel}>Cancel</Text>
        </Pressable>
        <Text style={styles.heading}>{heading}</Text>
        <View style={styles.topBtn} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]} keyboardShouldPersistTaps="handled">
        <Perforated
          color={colors.paperWarm}
          ground={colors.ground}
          top={
            <View style={styles.cardTop}>
              <Text style={label}>{count > 1 ? `${count} tickets found` : first?.code ? 'Code found' : 'No code found, keeping the page'}</Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="WHAT'S IT FOR?"
                placeholderTextColor="#A8A8A0"
                style={styles.titleInput}
                autoCapitalize="words"
                returnKeyType="done"
                maxLength={60}
                accessibilityLabel="Title"
                multiline
                blurOnSubmit
              />
            </View>
          }
          bottom={
            <View style={styles.cardBottom}>{first && <CodeView ticket={first} size={150} />}</View>
          }
        />

        <View style={styles.field}>
          <Text style={label}>Type</Text>
          <View style={styles.chips}>
            {KINDS.map((k) => {
              const on = k.id === kind;
              return (
                <Pressable
                  key={k.id}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  onPress={() => setKind(k.id)}
                  style={[styles.chip, on && styles.chipOn]}
                >
                  <Text style={[styles.chipText, on && styles.chipTextOn]}>{k.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.box}>
          <View style={styles.boxRow}>
            <Text style={styles.boxLabel}>Date</Text>
            {Platform.OS === 'ios' ? (
              <DateTimePicker value={toDate(date)} mode="date" display="compact" onChange={onDate} accentColor={colors.accent} />
            ) : (
              <Pressable onPress={() => openAndroid('date')} style={styles.valueBtn}>
                <Text style={styles.value}>{fmt.short(date)}</Text>
              </Pressable>
            )}
          </View>
          <View style={styles.divider} />
          <View style={styles.boxRow}>
            <Text style={styles.boxLabel}>Set a time</Text>
            <Switch
              value={time != null}
              onValueChange={(on) => setTime(on ? time ?? '09:00' : undefined)}
              trackColor={{ true: colors.accent, false: '#D6D6CF' }}
              accessibilityLabel="Set a time"
            />
          </View>
          {time != null && (
            <>
              <View style={styles.divider} />
              <View style={styles.boxRow}>
                <Text style={styles.boxLabel}>Time</Text>
                {Platform.OS === 'ios' ? (
                  <DateTimePicker
                    value={toDate(date, time)}
                    mode="time"
                    display="compact"
                    onChange={onTime}
                    accentColor={colors.accent}
                    minuteInterval={5}
                  />
                ) : (
                  <Pressable onPress={() => openAndroid('time')} style={styles.valueBtn}>
                    <Text style={styles.value}>{time}</Text>
                  </Pressable>
                )}
              </View>
            </>
          )}
        </View>
        <Text style={styles.reminder}>{reminderText(date, time)}</Text>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <Pressable
          accessibilityRole="button"
          onPress={() => onSave({ title, kind, date, time })}
          style={({ pressed }) => [styles.save, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.saveText}>{saveLabel}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ground },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  topBtn: { minWidth: 64, minHeight: 44, justifyContent: 'center' },
  cancel: { fontFamily: fonts.bodyMedium, fontSize: 16, color: colors.ink },
  heading: { fontFamily: fonts.monoBold, fontSize: 13, letterSpacing: 1.6, textTransform: 'uppercase', color: colors.ink },
  content: { paddingHorizontal: 20, paddingTop: 8, gap: 22 },
  cardTop: { padding: 20, gap: 8 },
  titleInput: {
    fontFamily: fonts.display,
    fontSize: 34,
    textTransform: 'uppercase',
    color: colors.ink,
    padding: 0,
    minHeight: 44,
  },
  cardBottom: { padding: 18, alignItems: 'center' },
  field: { gap: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1.5, borderColor: colors.ink, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9 },
  chipOn: { backgroundColor: colors.ink },
  chipText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.ink },
  chipTextOn: { color: colors.accent },
  box: { backgroundColor: colors.paper, borderRadius: 14, paddingHorizontal: 16 },
  boxRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  boxLabel: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.ink },
  divider: { height: 1, backgroundColor: '#E6E6E0' },
  valueBtn: { paddingVertical: 8, paddingHorizontal: 12, backgroundColor: colors.ground, borderRadius: 8 },
  value: { fontFamily: fonts.mono, fontSize: 15, color: colors.ink },
  reminder: { fontFamily: fonts.mono, fontSize: 12, color: colors.inkSoft, marginTop: -10 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 12, backgroundColor: colors.ground },
  save: { height: 56, borderRadius: 999, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  saveText: { fontFamily: fonts.bodyBold, fontSize: 17, color: colors.ink },
});
