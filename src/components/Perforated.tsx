import { useState, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors } from '../theme';

type Props = {
  top: ReactNode;
  bottom?: ReactNode;
  /** Card colour. */
  color: string;
  /** Colour behind the card, used for the notches. */
  ground: string;
  /** Dashed tear line colour. */
  rule?: string;
  radius?: number;
  notch?: number;
  style?: StyleProp<ViewStyle>;
};

/** A ticket: two halves joined by a dashed tear line with a notch bitten out of each side. */
export function Perforated({
  top,
  bottom,
  color,
  ground,
  rule = colors.perforation,
  radius = 18,
  notch = 24,
  style,
}: Props) {
  const [topHeight, setTopHeight] = useState(0);
  return (
    <View style={[{ backgroundColor: color, borderRadius: radius, overflow: 'hidden' }, style]}>
      <View onLayout={(e) => setTopHeight(e.nativeEvent.layout.height)}>{top}</View>
      {bottom != null && (
        <>
          <View style={[styles.rule, { borderColor: rule }]} />
          {topHeight > 0 && (
            <>
              <View
                style={[
                  styles.notch,
                  { width: notch, height: notch, borderRadius: notch / 2, backgroundColor: ground },
                  { left: -notch / 2, top: topHeight - notch / 2 + 1 },
                ]}
              />
              <View
                style={[
                  styles.notch,
                  { width: notch, height: notch, borderRadius: notch / 2, backgroundColor: ground },
                  { right: -notch / 2, top: topHeight - notch / 2 + 1 },
                ]}
              />
            </>
          )}
          {bottom}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  rule: { height: 0, borderTopWidth: 2, borderStyle: 'dashed', marginHorizontal: 18 },
  notch: { position: 'absolute' },
});
