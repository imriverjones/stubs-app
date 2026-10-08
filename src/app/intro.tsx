import { router } from 'expo-router';
import { useRef, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CodeView } from '../components/CodeView';
import { Icon } from '../components/Icon';
import { Perforated } from '../components/Perforated';
import { reminderStatus } from '../lib/reminders';
import { ensureReminders, setSettings } from '../lib/store';
import type { Ticket } from '../lib/types';
import { colors, fonts, label } from '../theme';

const SAMPLE: Ticket = { id: 'intro', pageUri: '', code: { symbology: 'qr', payload: 'STASH-INTRO-0001', cropUri: '' } };

type Slide = { kicker: string; title: string; body: string; art: ReactNode };

function TicketArt() {
  return (
    <View style={art.stack}>
      <View style={[art.behind, { backgroundColor: colors.ink, transform: [{ rotate: '-9deg' }, { translateX: -18 }] }]} />
      <View style={[art.behind, { backgroundColor: colors.accent, transform: [{ rotate: '6deg' }, { translateX: 14 }] }]} />
      <Perforated
        color={colors.paper}
        ground={colors.ground}
        style={art.ticket}
        top={
          <View style={art.top}>
            <Text style={label}>Ferry · Wed 14 Oct</Text>
            <Text style={art.title} numberOfLines={2}>
              Nidri → Kefalonia
            </Text>
          </View>
        }
        bottom={
          <View style={art.codeWrap}>
            <CodeView ticket={SAMPLE} size={112} />
          </View>
        }
      />
    </View>
  );
}

function ShareArt() {
  const rows: { icon: 'doc' | 'photo' | 'arrow'; text: string; from: string }[] = [
    { icon: 'doc', text: 'PDF ticket', from: 'Mail · Files' },
    { icon: 'photo', text: 'Screenshot', from: 'Photos' },
    { icon: 'arrow', text: 'Ticket link', from: 'Safari · Mail' },
  ];
  return (
    <View style={art.share}>
      {rows.map((r) => (
        <View key={r.text} style={art.shareRow}>
          <View style={art.shareIcon}>
            <Icon name={r.icon} size={18} color={colors.ink} stroke={2.2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={art.shareText}>{r.text}</Text>
            <Text style={art.shareFrom}>{r.from}</Text>
          </View>
        </View>
      ))}
      <Icon name="chevronDown" size={26} color={colors.inkSoft} stroke={2.4} />
      <View style={art.stashPill}>
        <Icon name="ticket" size={20} color={colors.ink} stroke={2.4} />
        <Text style={art.stashText}>Share → Stash</Text>
      </View>
    </View>
  );
}

function ReadArt() {
  const fields = [
    ['Date', '14 Nov'],
    ['Time', '19:30'],
    ['Section', 'Stalls'],
    ['Seat', 'J12'],
    ['Entrance', 'B'],
    ['Ref', 'K7XQ2LM'],
  ];
  return (
    <Perforated
      color={colors.paper}
      ground={colors.ground}
      style={art.readCard}
      top={
        <View style={art.top}>
          <Text style={label}>Theatre</Text>
          <Text style={art.title}>Your show</Text>
        </View>
      }
      bottom={
        <View style={art.grid}>
          {fields.map(([k, v]) => (
            <View key={k} style={art.field}>
              <Text style={art.fieldLabel}>{k}</Text>
              <Text style={art.fieldValue}>{v}</Text>
              <View style={art.mark} />
            </View>
          ))}
        </View>
      }
    />
  );
}

function LockArt() {
  return (
    <View style={art.phone}>
      <Text style={art.clock}>08:00</Text>
      <Text style={art.date}>Wednesday 14 October</Text>
      <View style={art.note}>
        <View style={art.noteIcon}>
          <Icon name="ticket" size={16} color={colors.ink} stroke={2.4} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={art.noteApp}>STASH · now</Text>
          <Text style={art.noteTitle}>Ferry today at 09:30</Text>
          <Text style={art.noteBody}>Seat 23A · Tap for your ticket</Text>
        </View>
      </View>
    </View>
  );
}

const SLIDES: Slide[] = [
  {
    kicker: 'Welcome to Stash',
    title: 'Every ticket. One place.',
    body: 'For the QR tickets that won’t go in Apple Wallet: gigs, theatre, ferries, trains, waterparks. Filed by date, ready when you are.',
    art: <TicketArt />,
  },
  {
    kicker: 'Adding tickets',
    title: 'Share it to Stash',
    body: 'In Mail, Files or Photos tap Share, then Stash. Or tap + for a screenshot, a PDF or a ticket link. A few people on one booking? Each code becomes its own ticket.',
    art: <ShareArt />,
  },
  {
    kicker: 'Reading',
    title: 'It reads the ticket for you',
    body: 'Date, time, seat, gate and booking ref are filled in. You just check and save. It all happens on your phone; nothing is uploaded.',
    art: <ReadArt />,
  },
  {
    kicker: 'On the day',
    title: 'Right there when you need it',
    body: 'A reminder 2 hours before (or 8am), and the ticket on your lock screen. Tap it and the code opens at full brightness.',
    art: <LockArt />,
  },
];

export default function Intro() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scroller = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);
  const last = page === SLIDES.length - 1;

  const finish = () => {
    setSettings({ introSeen: true });
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const next = async () => {
    if (!last) {
      scroller.current?.scrollTo({ x: width * (page + 1), animated: true });
      return;
    }
    if ((await reminderStatus()) === 'ask') await ensureReminders(true);
    finish();
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.bar}>
        <Text style={styles.brand}>Stash</Text>
        {!last && (
          <Pressable accessibilityRole="button" hitSlop={12} onPress={finish}>
            <Text style={styles.skip}>Skip</Text>
          </Pressable>
        )}
      </View>

      <ScrollView
        ref={scroller}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
        scrollEventThrottle={32}
        style={{ flex: 1 }}
      >
        {SLIDES.map((s) => (
          <View key={s.title} style={[styles.slide, { width }]}>
            <View style={styles.artArea}>{s.art}</View>
            <View style={styles.copy}>
              <Text style={[label, { color: colors.accent }]}>{s.kicker}</Text>
              <Text style={styles.title}>{s.title}</Text>
              <Text style={styles.body}>{s.body}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.dots} accessibilityLabel={`Page ${page + 1} of ${SLIDES.length}`}>
          {SLIDES.map((s, i) => (
            <View key={s.title} style={[styles.dot, i === page && styles.dotOn]} />
          ))}
        </View>
        <Pressable accessibilityRole="button" onPress={next} style={({ pressed }) => [styles.primary, pressed && { opacity: 0.85 }]}>
          <Text style={styles.primaryText}>{last ? 'Turn on reminders' : 'Next'}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={finish}
          style={[styles.ghost, !last && { opacity: 0 }]}
          disabled={!last}
          accessibilityElementsHidden={!last}
        >
          <Text style={styles.ghostText}>Not now</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ground },
  bar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, minHeight: 44 },
  brand: { fontFamily: fonts.display, fontSize: 28, textTransform: 'uppercase', color: colors.ink },
  skip: { fontFamily: fonts.bodyMedium, fontSize: 16, color: colors.inkSoft },
  slide: { flex: 1, paddingHorizontal: 24 },
  artArea: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 240 },
  copy: { gap: 10, paddingBottom: 8 },
  title: { fontFamily: fonts.display, fontSize: 40, textTransform: 'uppercase', color: colors.ink },
  body: { fontFamily: fonts.body, fontSize: 17, lineHeight: 24, color: colors.ink },
  footer: { paddingHorizontal: 24, gap: 14, paddingTop: 12 },
  dots: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.rule },
  dotOn: { width: 24, backgroundColor: colors.ink },
  primary: { height: 56, borderRadius: 999, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  primaryText: { fontFamily: fonts.bodyBold, fontSize: 17, color: colors.ink },
  ghost: { minHeight: 36, alignItems: 'center', justifyContent: 'center' },
  ghostText: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.inkSoft },
});

const art = StyleSheet.create({
  stack: { width: 240, alignItems: 'center', justifyContent: 'center' },
  behind: { position: 'absolute', width: 210, height: 250, borderRadius: 18 },
  ticket: { width: 230 },
  top: { padding: 18, gap: 6 },
  title: { fontFamily: fonts.display, fontSize: 30, textTransform: 'uppercase', color: colors.ink },
  codeWrap: { alignItems: 'center', paddingVertical: 18 },

  share: { width: '100%', maxWidth: 320, alignItems: 'center', gap: 10 },
  shareRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.paper,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  shareIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.paperWarm, alignItems: 'center', justifyContent: 'center' },
  shareText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.ink },
  shareFrom: { fontFamily: fonts.mono, fontSize: 12, color: colors.inkSoft },
  stashPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.accent,
    borderRadius: 999,
    paddingHorizontal: 22,
    paddingVertical: 14,
  },
  stashText: { fontFamily: fonts.bodyBold, fontSize: 17, color: colors.ink },

  readCard: { width: '100%', maxWidth: 320 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 18, paddingVertical: 14, rowGap: 14 },
  field: { width: '33.33%', gap: 2 },
  fieldLabel: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: colors.inkSoft },
  fieldValue: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.ink },
  mark: { height: 3, width: 28, borderRadius: 2, backgroundColor: colors.accent, marginTop: 2 },

  phone: {
    width: 250,
    height: 300,
    borderRadius: 34,
    backgroundColor: colors.night,
    alignItems: 'center',
    paddingTop: 34,
    paddingHorizontal: 12,
    gap: 2,
  },
  clock: { fontFamily: fonts.display, fontSize: 64, color: colors.nightText },
  date: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.nightSoft, marginBottom: 22 },
  note: {
    width: '100%',
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(244,244,240,0.14)',
    borderRadius: 18,
    padding: 12,
  },
  noteIcon: { width: 32, height: 32, borderRadius: 9, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  noteApp: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1, color: colors.nightSoft },
  noteTitle: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.nightText },
  noteBody: { fontFamily: fonts.body, fontSize: 13, color: colors.nightText },
});
