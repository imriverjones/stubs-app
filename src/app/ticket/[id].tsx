import { useKeepAwake } from 'expo-keep-awake';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  FlatList,
  Platform,
  Pressable,
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
import { removeStub, useStore } from '../../lib/store';
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
          <Text style={styles.outlineText}>Back to stubs</Text>
        </Pressable>
      </View>
    );
  }

  const count = stub.tickets.length;
  const cardWidth = width - H_PAD * 2;
  const codeSize = Math.min(cardWidth - 80, 300);

  const more = () => {
    const actions = ['Edit details', 'Delete', 'Cancel'];
    const handle = (i: number) => {
      if (i === 0) router.push({ pathname: '/edit/[id]', params: { id: stub.id } });
      if (i === 1) {
        router.back();
        const undo = removeStub(stub.id);
        showToast(`Deleted ${stub.title}`, { label: 'Undo', onPress: undo });
      }
    };
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions({ options: actions, destructiveButtonIndex: 1, cancelButtonIndex: 2 }, handle);
    } else {
      Alert.alert(stub.title, undefined, [
        { text: actions[0], onPress: () => handle(0) },
        { text: actions[1], style: 'destructive', onPress: () => handle(1) },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }]}>
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

      <FlatList
        data={stub.tickets}
        keyExtractor={(t) => t.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item, index }) => (
          <View style={{ width, paddingHorizontal: H_PAD }}>
            <TicketCard stub={stub} index={index} codeSize={codeSize}>
              <CodeView ticket={item} size={codeSize} />
            </TicketCard>
          </View>
        )}
      />

      {count > 1 && (
        <View style={styles.dots} accessibilityLabel={`Ticket ${page + 1} of ${count}. Swipe for the next one.`}>
          {stub.tickets.map((t, i) => (
            <View key={t.id} style={[styles.dot, i === page && styles.dotOn]} />
          ))}
        </View>
      )}

      <View style={{ flex: 1 }} />

      <View style={{ paddingHorizontal: H_PAD }}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push({ pathname: '/original/[id]', params: { id: stub.id } })}
          style={({ pressed }) => [styles.outline, pressed && { opacity: 0.6 }]}
        >
          <Text style={styles.outlineText}>View original</Text>
        </Pressable>
      </View>
    </View>
  );
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
          <Text style={styles.cardTitle} numberOfLines={3} adjustsFontSizeToFit minimumFontScale={0.7}>
            {stub.title}
          </Text>
          <View style={styles.grid}>
            <Field label="Date" value={`${relativeDay(stub.date) === 'Today' ? 'Today · ' : ''}${fmt.short(stub.date)}`} />
            {stub.time ? <Field label="Time" value={stub.time} /> : null}
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

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fieldBox}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.accent, gap: 16 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  counter: { backgroundColor: colors.ink, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  counterText: { fontFamily: fonts.monoBold, fontSize: 13, color: colors.paper },
  cardTop: { padding: 22, paddingBottom: 18, gap: 12 },
  cardLabel: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1.6, textTransform: 'uppercase', color: colors.inkSoft },
  cardTitle: { fontFamily: fonts.display, fontSize: 38, lineHeight: 42, textTransform: 'uppercase', color: colors.ink },
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
  outlineText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.ink },
  missing: { paddingHorizontal: H_PAD, gap: 12 },
  missingTitle: { fontFamily: fonts.display, fontSize: 44, textTransform: 'uppercase', color: colors.ink },
  missingBody: { fontFamily: fonts.body, fontSize: 16, color: colors.ink },
});
