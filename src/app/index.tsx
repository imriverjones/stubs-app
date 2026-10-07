import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../components/Icon';
import { Perforated } from '../components/Perforated';
import { RoundButton } from '../components/RoundButton';
import { showToast } from '../components/Toast';
import { dayKey, fmt, relativeDay } from '../lib/dates';
import { clearPast, groupStubs, removeStub, useStore } from '../lib/store';
import { KINDS, type Stub } from '../lib/types';
import { useAddTicket } from '../lib/useAddTicket';
import { colors, fonts, label } from '../theme';

const kindLabel = (s: Stub) => KINDS.find((k) => k.id === s.kind)?.label ?? 'Ticket';
const ticketCount = (s: Stub) => (s.tickets.length > 1 ? `${s.tickets.length} tickets` : '1 ticket');
const openStub = (id: string) => router.push({ pathname: '/ticket/[id]', params: { id } });

function deleteWithUndo(stub: Stub) {
  const undo = removeStub(stub.id);
  showToast(`Deleted ${stub.title}`, { label: 'Undo', onPress: undo });
}

export default function Home() {
  const insets = useSafeAreaInsets();
  const stubs = useStore((s) => s.stubs);
  const keepPastDays = useStore((s) => s.settings.keepPastDays);
  const today = dayKey();
  const groups = useMemo(() => groupStubs(stubs, today), [stubs, today]);
  const [showPast, setShowPast] = useState(false);
  const add = useAddTicket();
  const empty = stubs.length === 0;

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 96 }]}
      >
        <View style={styles.header}>
          <View>
            <Text style={label}>{fmt.short(today)}</Text>
            <Text style={styles.wordmark}>Stubs</Text>
          </View>
          <View style={styles.headerButtons}>
            <RoundButton label="Settings" color="transparent" onPress={() => router.push('/settings')}>
              <Icon name="settings" color={colors.ink} stroke={2.2} />
            </RoundButton>
            <RoundButton label="Add ticket" onPress={add.open} size={48}>
              {add.busy ? <ActivityIndicator color={colors.accent} /> : <Icon name="plus" color={colors.accent} size={22} />}
            </RoundButton>
          </View>
        </View>

        {empty && <EmptyState onAdd={add.open} />}

        {groups.today.length > 0 && (
          <View style={styles.section}>
            <Text style={label}>Today</Text>
            {groups.today.map((s) => (
              <TodayCard key={s.id} stub={s} />
            ))}
          </View>
        )}

        {groups.upcoming.length > 0 && (
          <View style={styles.section}>
            <Text style={label}>Upcoming</Text>
            {groups.upcoming.map((s) => (
              <SwipeToDelete key={s.id} stub={s}>
                <StubRow stub={s} />
              </SwipeToDelete>
            ))}
          </View>
        )}

        {groups.past.length > 0 && (
          <View style={styles.pastBlock}>
            <View style={styles.pastBar}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: showPast }}
                onPress={() => setShowPast((v) => !v)}
                style={styles.pastToggle}
                hitSlop={8}
              >
                <Text style={styles.pastText}>
                  {groups.past.length} past
                  {keepPastDays ? ` · auto-clear after ${keepPastDays} days` : ''}
                </Text>
                <Icon name={showPast ? 'chevronUp' : 'chevronDown'} size={16} color={colors.inkSoft} stroke={2.2} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  Alert.alert('Clear past tickets?', `Deletes ${groups.past.length} old ticket${groups.past.length > 1 ? 's' : ''} for good.`, [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Clear', style: 'destructive', onPress: clearPast },
                  ])
                }
                style={({ pressed }) => [styles.outlineBtn, pressed && { opacity: 0.6 }]}
              >
                <Text style={styles.outlineBtnText}>Clear now</Text>
              </Pressable>
            </View>
            {showPast &&
              groups.past.map((s) => (
                <SwipeToDelete key={s.id} stub={s}>
                  <StubRow stub={s} faded />
                </SwipeToDelete>
              ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function todayTitleSize(title: string) {
  const n = title.length;
  if (n <= 18) return { fontSize: 40 };
  if (n <= 32) return { fontSize: 33 };
  return { fontSize: 27 };
}

function TodayCard({ stub }: { stub: Stub }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${stub.title}, today${stub.time ? ` at ${stub.time}` : ''}. Show code.`}
      onPress={() => openStub(stub.id)}
      style={({ pressed }) => pressed && { transform: [{ scale: 0.985 }] }}
    >
      <Perforated
        color={colors.night}
        ground={colors.ground}
        rule={colors.nightRule}
        top={
          <View style={styles.todayTop}>
            <View style={styles.rowBetween}>
              <View style={styles.tag}>
                <Text style={styles.tagText}>{kindLabel(stub)}</Text>
              </View>
              <Text style={styles.todayMeta}>{ticketCount(stub)}</Text>
            </View>
            <Text style={[styles.todayTitle, todayTitleSize(stub.title)]}>{stub.title}</Text>
            <Text style={styles.todaySub}>{stub.time ? `Starts ${stub.time}` : 'Today'}</Text>
          </View>
        }
        bottom={
          <View style={[styles.rowBetween, styles.todayBottom]}>
            <Text style={styles.todayMeta}>Tap to show code</Text>
            <View style={styles.pill}>
              <Text style={styles.pillText}>Show code</Text>
              <Icon name="arrow" size={16} color={colors.ink} />
            </View>
          </View>
        }
      />
    </Pressable>
  );
}

function StubRow({ stub, faded }: { stub: Stub; faded?: boolean }) {
  const meta = [kindLabel(stub), stub.time, stub.tickets.length > 1 ? ticketCount(stub) : relativeDay(stub.date)]
    .filter(Boolean)
    .join(' · ');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${stub.title}, ${fmt.long(stub.date)}`}
      onPress={() => openStub(stub.id)}
      style={({ pressed }) => [styles.row, faded && { opacity: 0.6 }, pressed && { opacity: 0.8 }]}
    >
      <View style={styles.rowDate}>
        <Text style={styles.rowDay}>{fmt.dayNum(stub.date)}</Text>
        <Text style={styles.rowDow}>{fmt.dow(stub.date)}</Text>
      </View>
      <View style={styles.rowRule} />
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {stub.title}
        </Text>
        <Text style={styles.rowMeta} numberOfLines={1}>
          {meta}
        </Text>
      </View>
    </Pressable>
  );
}

function SwipeToDelete({ stub, children }: { stub: Stub; children: React.ReactNode }) {
  return (
    <ReanimatedSwipeable
      friction={1.6}
      rightThreshold={60}
      overshootRight={false}
      onSwipeableOpen={() => deleteWithUndo(stub)}
      renderRightActions={() => (
        <View style={styles.deleteAction}>
          <Icon name="trash" color={colors.paper} size={22} stroke={2.2} />
        </View>
      )}
    >
      {children}
    </ReanimatedSwipeable>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <Perforated
      color={colors.paper}
      ground={colors.ground}
      style={{ marginTop: 8 }}
      top={
        <View style={styles.emptyTop}>
          <Text style={label}>Admit one</Text>
          <Text style={styles.emptyTitle}>No stubs yet</Text>
          <Text style={styles.emptyBody}>
            In Mail, tap your ticket PDF, then Share → Stubs. Or add a screenshot. It shows up here, and Stubs pings you on
            the day.
          </Text>
        </View>
      }
      bottom={
        <View style={styles.emptyBottom}>
          <Pressable
            accessibilityRole="button"
            onPress={onAdd}
            style={({ pressed }) => [styles.primary, pressed && { opacity: 0.85 }]}
          >
            <Icon name="plus" size={18} color={colors.ink} />
            <Text style={styles.primaryText}>Add your first ticket</Text>
          </Pressable>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ground },
  content: { paddingHorizontal: 20, gap: 24 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  headerButtons: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  wordmark: { fontFamily: fonts.display, fontSize: 48, textTransform: 'uppercase', color: colors.ink },
  section: { gap: 10 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

  todayTop: { padding: 20, paddingBottom: 18, gap: 10 },
  todayBottom: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 18 },
  tag: { backgroundColor: colors.accent, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4 },
  tagText: { fontFamily: fonts.monoBold, fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: colors.ink },
  todayTitle: { fontFamily: fonts.display, fontSize: 40, textTransform: 'uppercase', color: colors.nightText },
  todaySub: { fontFamily: fonts.mono, fontSize: 13, color: '#D6D6CF' },
  todayMeta: { fontFamily: fonts.mono, fontSize: 12, color: colors.nightSoft },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.accent,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  pillText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },

  row: { backgroundColor: colors.paper, borderRadius: 14, flexDirection: 'row', alignItems: 'stretch', height: 76 },
  rowDate: { width: 74, alignItems: 'center', justifyContent: 'center' },
  rowDay: { fontFamily: fonts.display, fontSize: 30, color: colors.ink },
  rowDow: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1, color: colors.inkSoft },
  rowRule: { borderLeftWidth: 2, borderStyle: 'dashed', borderColor: colors.perforation, marginVertical: 10 },
  rowBody: { flex: 1, paddingHorizontal: 16, justifyContent: 'center', gap: 4 },
  rowTitle: { fontFamily: fonts.bodyBold, fontSize: 17, color: colors.ink },
  rowMeta: { fontFamily: fonts.mono, fontSize: 12, color: colors.inkSoft },
  deleteAction: {
    width: 88,
    marginLeft: 10,
    borderRadius: 14,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },

  pastBlock: { gap: 10, borderTopWidth: 1, borderColor: colors.rule, paddingTop: 14 },
  pastBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  pastToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1, minHeight: 44 },
  pastText: { fontFamily: fonts.mono, fontSize: 12, color: colors.inkSoft, flexShrink: 1 },
  outlineBtn: { borderWidth: 1.5, borderColor: colors.ink, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 },
  outlineBtnText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.ink },

  emptyTop: { padding: 22, gap: 10 },
  emptyTitle: { fontFamily: fonts.display, fontSize: 44, textTransform: 'uppercase', color: colors.ink },
  emptyBody: { fontFamily: fonts.body, fontSize: 16, lineHeight: 23, color: colors.inkSoft },
  emptyBottom: { padding: 20 },
  primary: {
    height: 54,
    borderRadius: 999,
    backgroundColor: colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.ink },
});
