import { Tabs, type BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../../components/Icon';
import { dayKey } from '../../lib/dates';
import { isArchived, useStore } from '../../lib/store';
import { colors, fonts } from '../../theme';

const TABS: Record<string, { label: string; icon: 'ticket' | 'home' }> = {
  index: { label: 'Tickets', icon: 'ticket' },
  stays: { label: 'Stays', icon: 'home' },
};

/** Tear-off tab bar: paper ground, ink pill on the active tab. */
function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  // A dot on Stays while you're staying somewhere or checking in today.
  const stayingNow = useStore((s) => s.stubs.some((x) => x.kind === 'stay' && x.date <= dayKey() && !isArchived(x)));
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]} accessibilityRole="tablist">
      {state.routes.map((route, i) => {
        const tab = TABS[route.name];
        if (!tab) return null;
        const active = state.index === i;
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={tab.label}
            onPress={() => {
              const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!active && !e.defaultPrevented) navigation.navigate(route.name);
            }}
            style={styles.item}
          >
            <View style={[styles.pill, active && styles.pillOn]}>
              <Icon name={tab.icon} size={20} color={active ? colors.accent : colors.inkSoft} stroke={2.2} />
              <Text style={[styles.label, active && styles.labelOn]}>{tab.label}</Text>
              {route.name === 'stays' && stayingNow && !active ? <View style={styles.dot} /> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.ground } }} tabBar={(p) => <TabBar {...p} />}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="stays" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.ground,
    borderTopWidth: 1,
    borderTopColor: colors.rule,
    paddingTop: 8,
    paddingHorizontal: 16,
    gap: 8,
  },
  item: { flex: 1, alignItems: 'center' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 18,
    borderRadius: 999,
  },
  pillOn: { backgroundColor: colors.ink },
  label: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.inkSoft },
  labelOn: { color: colors.paper },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent, marginLeft: -2 },
});
