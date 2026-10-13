import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { companyOf } from '../../components/CompanyMark';
import { Icon } from '../../components/Icon';
import { RoundButton } from '../../components/RoundButton';
import { showToast } from '../../components/Toast';
import { dayKey, daysBetween, fmt } from '../../lib/dates';
import { ticketAccent } from '../../lib/palette';
import { mergeTrips, renameTrip, ungroupTrip } from '../../lib/store';
import { askTripName, pick } from '../../lib/tripActions';
import { tripDates, tripNights } from '../../lib/trips';
import type { Stub } from '../../lib/types';
import { iconFor, useTrips } from '../../lib/useTrips';
import { colors, fonts, label } from '../../theme';

type Row = { key: string; day: string; time?: string; stub: Stub; title: string; sub: string; checkout?: boolean };

/** Everything that happens on the trip, day by day. Stays get a check-out line on their last day. */
function rowsFor(items: Stub[]): Row[] {
  const rows: Row[] = [];
  for (const s of items) {
    const n = s.tickets.length;
    if (s.kind === 'stay') {
      rows.push({ key: s.id, day: s.date, time: s.time, stub: s, title: s.title, sub: 'Check in' });
      if (s.stay?.checkOutDate) rows.push({ key: `${s.id}-out`, day: s.stay.checkOutDate, time: s.stay.checkOutTime, stub: s, title: s.title, sub: 'Check out', checkout: true });
    } else {
      rows.push({ key: s.id, day: s.date, time: s.time, stub: s, title: s.title, sub: [companyOf(s), n > 1 ? `${n} tickets` : ''].filter(Boolean).join(' · ') });
    }
  }
  return rows.sort((a, b) => (a.day === b.day ? (a.time ?? '99:99').localeCompare(b.time ?? '99:99') : a.day.localeCompare(b.day)));
}

export default function TripScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const trips = useTrips();
  const trip = trips.find((t) => t.id === id);

  if (!trip) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 20, paddingHorizontal: 20, gap: 16 }]}>
        <RoundButton label="Back" onPress={() => router.back()} size={44}>
          <Icon name="back" color={colors.paper} />
        </RoundButton>
        <Text style={styles.name}>Trip over</Text>
        <Text style={styles.body}>Everything on this trip has been used or has passed. You’ll find it in Archive.</Text>
      </View>
    );
  }

  const today = dayKey();
  const days = daysBetween(today, trip.start);
  const nights = tripNights(trip);
  const accent = ticketAccent(trip.items[0]?.color, colors.accent);
  const rows = rowsFor(trip.items);
  const byDay = rows.reduce<Record<string, Row[]>>((m, r) => ({ ...m, [r.day]: [...(m[r.day] ?? []), r] }), {});

  const more = () => {
    const others = trips.filter((t) => t.id !== trip.id);
    const actions: [string, () => void][] = [
      ['Rename trip', () => askTripName('Rename trip', trip.name, (name) => renameTrip(trip, name))],
      ...(others.length
        ? ([
            [
              'Merge with another trip',
              () =>
                pick('Merge into this trip', others.map((t) => `${t.name} · ${tripDates(t.start, t.end)}`), (i) => {
                  if (i < 0) return;
                  mergeTrips(trip, others[i]);
                  showToast(`${others[i].name} merged in`);
                }),
            ],
          ] as [string, () => void][])
        : []),
      [
        'Not a trip',
        () => {
          ungroupTrip(trip);
          router.back();
          showToast('Back to single tickets');
        },
      ],
    ];
    pick(trip.name, actions.map((a) => a[0]), (i) => i >= 0 && actions[i][1]());
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 32 }}>
      <View style={styles.topBar}>
        <RoundButton label="Back" onPress={() => router.back()} size={44}>
          <Icon name="back" color={colors.paper} />
        </RoundButton>
        <RoundButton label="Trip options" onPress={more} size={44}>
          <Icon name="more" color={colors.paper} />
        </RoundButton>
      </View>

      <View style={[styles.hero, { backgroundColor: accent }]}>
        <Text style={styles.kicker}>{days > 0 ? `Trip · in ${days} day${days === 1 ? '' : 's'}` : 'Trip · away now'}</Text>
        <Text style={[styles.name, trip.name.length > 14 && { fontSize: 40, lineHeight: 42 }]}>{trip.name}</Text>
        <Text style={styles.heroMeta}>
          {[tripDates(trip.start, trip.end), nights ? `${nights} night${nights === 1 ? '' : 's'}` : '', `${trip.items.length} booked`].filter(Boolean).join(' · ')}
        </Text>
      </View>

      <View style={styles.list}>
        {Object.entries(byDay).map(([day, dayRows]) => (
          <View key={day} style={styles.day}>
            <Text style={label}>{day === today ? `Today · ${fmt.short(day)}` : fmt.short(day)}</Text>
            {dayRows.map((r) => (
              <Pressable
                key={r.key}
                accessibilityRole="button"
                accessibilityLabel={`${r.title}, ${r.sub}${r.time ? ` at ${r.time}` : ''}`}
                onPress={() => router.push({ pathname: '/ticket/[id]', params: { id: r.stub.id } })}
                style={({ pressed }) => [styles.row, r.checkout && styles.rowQuiet, pressed && { opacity: 0.8 }]}
              >
                <Text style={styles.time}>{r.time ?? '—'}</Text>
                <View style={[styles.icon, { backgroundColor: ticketAccent(r.stub.color, colors.accent) }]}>
                  <Icon name={iconFor(r.stub.kind)} size={18} color={colors.ink} stroke={2.2} />
                </View>
                <View style={styles.rowBody}>
                  <Text style={styles.rowTitle} numberOfLines={2}>
                    {r.title}
                  </Text>
                  {r.sub ? (
                    <Text style={styles.rowSub} numberOfLines={1}>
                      {r.sub}
                    </Text>
                  ) : null}
                </View>
              </Pressable>
            ))}
          </View>
        ))}
        <Text style={styles.hint}>Something missing or in the wrong trip? Open it and tap ⋯ → Add to trip or Take out of trip.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ground },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 16 },
  hero: { marginHorizontal: 20, borderRadius: 22, padding: 22, gap: 6 },
  kicker: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1.6, textTransform: 'uppercase', color: colors.ink },
  name: { fontFamily: fonts.display, fontSize: 52, lineHeight: 54, textTransform: 'uppercase', color: colors.ink },
  heroMeta: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 22, color: colors.inkSoft },
  list: { paddingHorizontal: 20, paddingTop: 24, gap: 22 },
  day: { gap: 8 },
  row: { backgroundColor: colors.paper, borderRadius: 14, minHeight: 68, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 12 },
  rowQuiet: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.rule, borderStyle: 'dashed' },
  time: { fontFamily: fonts.monoBold, fontSize: 13, color: colors.ink, width: 44 },
  icon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowBody: { flex: 1, gap: 2 },
  rowTitle: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.ink, textTransform: 'uppercase' },
  rowSub: { fontFamily: fonts.mono, fontSize: 12, color: colors.inkSoft },
  hint: { fontFamily: fonts.mono, fontSize: 12, lineHeight: 18, color: colors.inkSoft, textAlign: 'center', paddingHorizontal: 12 },
});
