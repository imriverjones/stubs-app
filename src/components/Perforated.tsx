import { useState, type ReactNode } from 'react';
import { Animated, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
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
  /** 0 → 1 tears the bottom stub off along the dashed line (used when marking a ticket used). */
  tear?: Animated.Value;
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
  tear,
}: Props) {
  const [topHeight, setTopHeight] = useState(0);
  if (tear && bottom != null) {
    // Two pieces so the stub can come away: same look as below until `tear` moves.
    return (
      <View style={style}>
        <View
          style={{ backgroundColor: color, borderTopLeftRadius: radius, borderTopRightRadius: radius, overflow: 'hidden' }}
          onLayout={(e) => setTopHeight(e.nativeEvent.layout.height)}
        >
          {top}
        </View>
        <Animated.View
          style={{
            backgroundColor: color,
            borderBottomLeftRadius: radius,
            borderBottomRightRadius: radius,
            overflow: 'hidden',
            opacity: tear.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] }),
            transform: [
              { translateY: tear.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 6, 520] }) },
              { translateX: tear.interpolate({ inputRange: [0, 1], outputRange: [0, 40] }) },
              { rotate: tear.interpolate({ inputRange: [0, 0.15, 1], outputRange: ['0deg', '-2deg', '16deg'] }) },
            ],
          }}
        >
          <View style={[styles.rule, { borderColor: rule }]} />
          {bottom}
        </Animated.View>
        {topHeight > 0 && (
          <>
            <View style={[styles.notch, { width: notch, height: notch, borderRadius: notch / 2, backgroundColor: ground }, { left: -notch / 2, top: topHeight - notch / 2 + 1 }]} />
            <View style={[styles.notch, { width: notch, height: notch, borderRadius: notch / 2, backgroundColor: ground }, { right: -notch / 2, top: topHeight - notch / 2 + 1 }]} />
          </>
        )}
      </View>
    );
  }
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
