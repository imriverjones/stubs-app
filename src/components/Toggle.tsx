import { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet } from 'react-native';
import { colors } from '../theme';

type Props = {
  value: boolean;
  onValueChange: (value: boolean) => void;
  accessibilityLabel: string;
  disabled?: boolean;
};

const W = 52;
const H = 32;
const KNOB = 26;
const PAD = (H - KNOB) / 2;

/**
 * Our own on/off switch. iOS's native one draws larger than the space React Native gives it
 * on recent iOS versions, so it sat high and off to the right in rows.
 */
export function Toggle({ value, onValueChange, accessibilityLabel, disabled }: Props) {
  const [x] = useState(() => new Animated.Value(value ? 1 : 0));
  useEffect(() => {
    Animated.timing(x, { toValue: value ? 1 : 0, duration: 160, useNativeDriver: false }).start();
  }, [value, x]);

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      hitSlop={8}
      onPress={() => onValueChange(!value)}
      style={disabled && { opacity: 0.4 }}
    >
      <Animated.View
        style={[
          styles.track,
          { backgroundColor: x.interpolate({ inputRange: [0, 1], outputRange: ['#D6D6CF', colors.accent] }) },
        ]}
      >
        <Animated.View
          style={[styles.knob, { transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [0, W - KNOB - PAD * 2] }) }] }]}
        />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: { width: W, height: H, borderRadius: H / 2, padding: PAD, justifyContent: 'center' },
  knob: {
    width: KNOB,
    height: KNOB,
    borderRadius: KNOB / 2,
    backgroundColor: colors.paper,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
});
