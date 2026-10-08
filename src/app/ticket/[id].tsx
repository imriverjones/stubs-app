import { useKeepAwake } from 'expo-keep-awake';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CodeView } from '../../components/CodeView';
import { Icon } from '../../components/Icon';
import { Perforated } from '../../components/Perforated';
import { RoundButton } from '../../components/RoundButton';
import { showToast } from '../../components/Toast';
import { fmt, relativeDay } from '../../lib/dates';
import { rereadStub } from '../../lib/importer';
import { canSendAll, sendAll, sendTicket } from '../../lib/send';
import { applyReread, removeStub, setUsed, useStore } from '../../lib/store';
import { KINDS, type Stub } from '../../lib/types';
import { useMaxBrightness } from '../../lib/useMaxBrightness';
import { colors, fonts } from '../../theme';

const H_PAD = 20;

export default function TicketScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const stub = useStore((s) => s.stubs.find((x) => x.id === id));
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [page, setPage] = useState(0);
  useKeepAwake();
  useMaxBrightness();

  if (!stub) {
    return (
      <View style={[styles.screen, styles.missing, { paddingTop: insets.top + 40 }]}>
        <Text style={styles.missingTitle}>Ticket gone</Text>
        <Text style={styles.missingBody}>It may have been deleted or auto-cleared.</Text>
        <Pressable onPress={() => router.replace('/')} style={styles.outline}>
          <Text style={styles.outlineText}>Back to Stash</Text>
        </Pressable>
      </View>
    );
  }

  const count = stub.tickets.length;
  const cardWidth = width - H_PAD * 2;
  const codeSize = Math.min(cardWidth - 80, 300);

  const more = () => {
    const sample = !!stub.sample;
    const items: { label: string; run: () => void; destructive?: boolean }[] = [
      ...(sample ? [] : [{
        label: count > 1 ? `Send ticket ${page + 1}` : 'Send ticket',
        run: () => sendTicket(stub, page).catch((e) => Alert.alert("Couldn't send", String(e?.message ?? e))),
      }]),
      ...(!sample && canSendAll(stub)
        ? [{ label: `Send all ${count} tickets`, run: () => sendAll(stub).catch((e) => Alert.alert("Couldn't send", String(e?.message ?? e))) }]
        : []),
      ...(sample ? [] : [{ label: 'Re-read ticket details', run: reread }]),
      { label: 'Edit details', run: () => router.push({ pathname: '/edit/[id]', params: { id: stub.id } }) },
      {
        label: 'Delete',
        destructive: true,
        run: () => {
          router.back();
          const undo = removeStub(stub.id);
          showToast(`Deleted ${stub.title}`, { label: 'Undo', onPress: undo });
        },
      },
    ];
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [...items.map((i) => i.label), 'Cancel'],
          destructiveButtonIndex: items.findIndex((i) => i.destructive),
          cancelButtonIndex: items.length,
        },
        (i) => items[i]?.run(),
      );
    } else {
      Alert.alert(stub.title, undefined, [
        ...items.map((i) => ({ text: i.label, style: i.destructive ? ('destructive' as const) : undefined, onPress: i.run })),
        { text: 'Cancel', style: 'cancel' as const },
      ]);
    }
  };

  async function reread() {
    try {
      const found = await rereadStub(stub!);
      const n = await applyReread(stub!.id, found);
      showToast(n ? `Found ${n} detail${n === 1 ? '' : 's'}` : 'No extra details on this ticket');
    } catch (e) {
      Alert.alert("Couldn't read the ticket", e instanceof Error ? e.message : String(e));
    }
  }

  const toggleUsed = async () => {
    const used = !stub.usedAt;
    const undo = await setUsed(stub.id, used);
    if (used) {
      router.back();
      showToast('Moved to Archive', { label: 'Undo', onPress: undo });
    }
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.scrollBody, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }]}
    >
      <View style={[styles.topBar, { paddingHorizontal: H_PAD }]}>
        <RoundButton label="Back" onPress={() => router.back()} size={44}>
          <Icon name="back" color={colors.paper} />
        </RoundButton>
        {count > 1 ? (
          <View style={styles.counter}>
            <Text style={styles.counterText}>
              {page + 1} / {count}
            </Text>
          </View>
        ) : (
          <View />
        )}
        <RoundButton label="More options" onPress={more} size={44}>
          <Icon name="more" color={colors.paper} />
        </RoundButton>
      </View>

      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
      >
        {stub.tickets.map((item, index) => (
          <View key={item.id} style={{ width, paddingHorizontal: H_PAD }}>
            <TicketCard stub={stub} index={index} codeSize={codeSize}>
              <CodeView ticket={item} size={codeSize} />
            </TicketCard>
          </View>
        ))}
      </ScrollView>

      {count > 1 && (
        <View style={styles.dots} accessibilityLabel={`Ticket ${page + 1} of ${count}. Swipe for the next one.`}>
          {stub.tickets.map((t, i) => (
            <View key={t.id} style={[styles.dot, i === page && styles.dotOn]} />
          ))}
        </View>
      )}

      <View style={{ flex: 1, minHeight: 8 }} />

      <View style={styles.bottomRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityHint={stub.usedAt ? 'Moves it back to your upcoming tickets' : 'Moves it to Archive'}
          onPress={toggleUsed}
          style={({ pressed }) => [styles.solid, pressed && { opacity: 0.8 }]}
        >
          <Text style={styles.solidText}>{stub.usedAt ? 'Not used yet' : 'Used'}</Text>
        </Pressable>
        {stub.sample ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              router.back();
              removeStub(stub.id);
              showToast('Sample removed. Share a real ticket to Stash to add it.');
            }}
            style={({ pressed }) => [styles.outline, styles.grow, pressed && { opacity: 0.6 }]}
          >
            <Text style={styles.outlineText}>Remove sample</Text>
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/original/[id]', params: { id: stub.id } })}
            style={({ pressed }) => [styles.outline, styles.grow, pressed && { opacity: 0.6 }]}
          >
            <Text style={styles.outlineText}>View original</Text>
          </Pressable>
        )}
      </View>
    </ScrollView>
  );
}

/** Long names step down in size instead of being cut off. */
function titleSize(title: string) {
  const n = title.length;
  if (n <= 18) return { fontSize: 38 };
  if (n <= 32) return { fontSize: 32 };
  if (n <= 48) return { fontSize: 27 };
  return { fontSize: 23 };
}

function TicketCard({ stub, index, children }: { stub: Stub; index: number; codeSize: number; children: React.ReactNode }) {
  const kind = KINDS.find((k) => k.id === stub.kind)?.label ?? 'Ticket';
  const count = stub.tickets.length;
  return (
    <Perforated
      color={colors.paperWarm}
      ground={colors.accent}
      radius={22}
      notch={26}
      rule="#CFCFC6"
      top={
        <View style={styles.cardTop}>
          <Text style={styles.cardLabel}>
            {kind}
            {count > 1 ? ` · ${index + 1} of ${count}` : ''}
          </Text>
          <Text style={[styles.cardTitle, titleSize(stub.title)]}>{stub.title}</Text>
          <View style={styles.grid}>
            <Field label="Date" value={`${relativeDay(stub.date) === 'Today' ? 'Today · ' : ''}${fmt.short(stub.date)}`} />
            {stub.time ? <Field label="Time" value={stub.time} /> : null}
            {[...(stub.tickets[index]?.details ?? []), ...(stub.details ?? [])].map((d, i) => (
              <Field key={`${d.label}-${i}`} label={d.label === 'Ref' ? 'Booking ref' : d.label} value={d.value} mono={d.label === 'Ref'} />
            ))}
          </View>
        </View>
      }
      bottom={
        <View style={styles.cardBottom}>
          {children}
          <View style={styles.bright}>
            <Icon name="sun" size={14} color={colors.inkSoft} stroke={2.2} />
            <Text style={styles.brightText}>Brightness boosted</Text>
          </View>
        </View>
      }
    />
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <View style={styles.fieldBox}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={[styles.fieldValue, mono && { fontFamily: fonts.mono }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.accent },
  scrollBody: { flexGrow: 1, gap: 16 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  counter: { backgroundColor: colors.ink, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  counterText: { fontFamily: fonts.monoBold, fontSize: 13, color: colors.paper },
  cardTop: { padding: 22, paddingBottom: 18, gap: 12 },
  cardLabel: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1.6, textTransform: 'uppercase', color: colors.inkSoft },
  cardTitle: { fontFamily: fonts.display, fontSize: 38, textTransform: 'uppercase', color: colors.ink },
  grid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 28, rowGap: 10 },
  fieldBox: { gap: 2 },
  fieldLabel: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', color: colors.inkFaint },
  fieldValue: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  cardBottom: { padding: 20, alignItems: 'center', gap: 12 },
  bright: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  brightText: { fontFamily: fonts.mono, fontSize: 12, color: colors.inkSoft },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(17,17,17,0.35)' },
  dotOn: { width: 22, backgroundColor: colors.ink },
  outline: {
    height: 54,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  bottomRow: { flexDirection: 'row', gap: 10, paddingHorizontal: H_PAD },
  grow: { flex: 1 },
  solid: {
    height: 54,
    borderRadius: 999,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 26,
  },
  solidText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.paper },
  outlineText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.ink },
  missing: { paddingHorizontal: H_PAD, gap: 12 },
  missingTitle: { fontFamily: fonts.display, fontSize: 44, textTransform: 'uppercase', color: colors.ink },
  missingBody: { fontFamily: fonts.body, fontSize: 16, color: colors.ink },
});
