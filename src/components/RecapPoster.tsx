import { StyleSheet, Text, View } from "react-native";
import type { Recap } from "../lib/recap";
import { colors, fonts } from "../theme";
import { Holo } from "./Holo";
import { Logo } from "./Logo";

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statN}>{n}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

/** The shareable Year in tickets poster. */
export function RecapPoster({ recap }: { recap: Recap }) {
  const { year } = recap;
  return (
    <View style={styles.poster}>
      <Holo intensity={0.22} />
      <View style={styles.brand}>
        <Logo size={34} />
        <Text style={styles.brandText}>Stash</Text>
      </View>
      <Text style={styles.kicker}>My {year} in tickets</Text>
      <Text style={styles.total}>{recap.total}</Text>
      <Text style={styles.totalLabel}>
        {recap.total === 1 ? "Ticket" : "Tickets"}
      </Text>

      <View style={styles.grid}>
        <Stat n={recap.events} label="Gigs & events" />
        <Stat n={recap.flights} label="Flights" />
        <Stat n={recap.journeys} label="Ferries, trains & buses" />
        <Stat n={recap.nights} label="Nights away" />
      </View>

      {recap.busiestMonth ? (
        <View style={styles.line}>
          <Text style={styles.lineLabel}>Busiest month</Text>
          <Text style={styles.lineValue}>
            {recap.busiestMonth.name} · {recap.busiestMonth.count}
          </Text>
        </View>
      ) : null}
      {recap.places.length ? (
        <View style={styles.line}>
          <Text style={styles.lineLabel}>Where I went</Text>
          <Text style={styles.lineValue}>{recap.places.join(" · ")}</Text>
        </View>
      ) : null}
      <Text style={styles.footer}>stash · every ticket in one place</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  poster: {
    backgroundColor: colors.night,
    borderRadius: 26,
    padding: 24,
    overflow: "hidden",
    gap: 6,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  brandText: {
    fontFamily: fonts.display,
    fontSize: 24,
    textTransform: "uppercase",
    color: colors.nightText,
  },
  kicker: {
    fontFamily: fonts.monoBold,
    fontSize: 12,
    letterSpacing: 1.8,
    textTransform: "uppercase",
    color: colors.accent,
  },
  total: {
    fontFamily: fonts.display,
    fontSize: 120,
    color: colors.nightText,
    marginTop: 4,
  },
  totalLabel: {
    fontFamily: fonts.display,
    fontSize: 34,
    textTransform: "uppercase",
    color: colors.nightText,
    marginTop: -10,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", marginTop: 20, rowGap: 18 },
  stat: { width: "50%", gap: 2 },
  statN: { fontFamily: fonts.display, fontSize: 44, color: colors.accent },
  statLabel: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: colors.nightSoft,
    paddingRight: 8,
  },
  line: { marginTop: 18, gap: 4 },
  lineLabel: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: colors.nightSoft,
  },
  lineValue: {
    fontFamily: fonts.bodyBold,
    fontSize: 20,
    color: colors.nightText,
  },
  footer: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.nightSoft,
    marginTop: 28,
  },
});
