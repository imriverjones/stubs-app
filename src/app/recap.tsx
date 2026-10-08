import * as Sharing from "expo-sharing";
import { router } from "expo-router";
import { useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { captureRef } from "react-native-view-shot";
import { RecapPoster } from "../components/RecapPoster";
import { showToast } from "../components/Toast";
import { haptic } from "../lib/native";
import { makeRecap, recapYears } from "../lib/recap";
import { useStore } from "../lib/store";
import { colors, fonts } from "../theme";

/** Your year in tickets, as a poster you can share. */
export default function RecapScreen() {
  const insets = useSafeAreaInsets();
  const history = useStore((s) => s.history);
  const years = useMemo(() => recapYears(history), [history]);
  const [year, setYear] = useState(() => years[0] ?? new Date().getFullYear());
  const recap = useMemo(() => makeRecap(history, year), [history, year]);
  const poster = useRef<View>(null);
  const [sharing, setSharing] = useState(false);

  const share = async () => {
    if (!poster.current || sharing) return;
    setSharing(true);
    try {
      const uri = await captureRef(poster, {
        format: "png",
        quality: 1,
        result: "tmpfile",
      });
      haptic("success");
      await Sharing.shareAsync(uri, {
        mimeType: "image/png",
        dialogTitle: `My ${year} in tickets`,
      });
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Couldn't share that");
    } finally {
      setSharing(false);
    }
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      <View style={styles.bar}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          hitSlop={12}
        >
          <Text style={styles.close}>Close</Text>
        </Pressable>
        <View style={styles.years}>
          {years.slice(0, 3).map((y) => (
            <Pressable
              key={y}
              accessibilityRole="button"
              accessibilityState={{ selected: y === year }}
              onPress={() => setYear(y)}
              style={[styles.year, y === year && styles.yearOn]}
            >
              <Text style={[styles.yearText, y === year && styles.yearTextOn]}>
                {y}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: 20,
          paddingBottom: insets.bottom + 110,
        }}
      >
        <View ref={poster} collapsable={false}>
          <RecapPoster recap={recap} />
        </View>
        {recap.total === 0 ? (
          <Text style={styles.empty}>
            Nothing saved for {year} yet. Add tickets and they’ll count here.
          </Text>
        ) : null}
      </ScrollView>

      <View style={[styles.actions, { paddingBottom: insets.bottom + 12 }]}>
        <Pressable
          accessibilityRole="button"
          onPress={share}
          disabled={sharing || recap.total === 0}
          style={({ pressed }) => [
            styles.shareBtn,
            (pressed || sharing) && { opacity: 0.8 },
            recap.total === 0 && { opacity: 0.4 },
          ]}
        >
          <Text style={styles.shareText}>
            {sharing ? "Getting it ready…" : "Share my year"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ground },
  bar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    minHeight: 48,
  },
  close: { fontFamily: fonts.bodyMedium, fontSize: 16, color: colors.ink },
  years: { flexDirection: "row", gap: 6 },
  year: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: colors.ink,
  },
  yearOn: { backgroundColor: colors.ink },
  yearText: { fontFamily: fonts.monoBold, fontSize: 12, color: colors.ink },
  yearTextOn: { color: colors.accent },
  empty: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.inkSoft,
    textAlign: "center",
    marginTop: 16,
  },
  actions: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: colors.ground,
  },
  shareBtn: {
    height: 56,
    borderRadius: 999,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  shareText: { fontFamily: fonts.bodyBold, fontSize: 17, color: colors.ink },
});
