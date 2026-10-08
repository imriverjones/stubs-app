import { Pressable, StyleSheet, View } from 'react-native';
import { PALETTE, type ColorId } from '../lib/palette';
import { colors } from '../theme';

/** A row of colour dots; the selected one gets a black ring. */
export function Swatches({ value, onChange }: { value: ColorId | undefined; onChange: (id: ColorId) => void }) {
  return (
    <View style={styles.row} accessibilityRole="radiogroup">
      {PALETTE.map((p) => {
        const on = p.id === (value ?? 'orange');
        return (
          <Pressable
            key={p.id}
            accessibilityRole="radio"
            accessibilityLabel={p.label}
            accessibilityState={{ selected: on }}
            hitSlop={4}
            onPress={() => onChange(p.id)}
            style={[styles.ring, on && styles.ringOn]}
          >
            <View style={[styles.dot, { backgroundColor: p.accent }]} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  ring: { width: 40, height: 40, borderRadius: 20, borderWidth: 2.5, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  ringOn: { borderColor: colors.ink },
  dot: { width: 30, height: 30, borderRadius: 15 },
});
