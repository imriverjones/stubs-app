import { useEffect, useId, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { hasMotion } from '../lib/native';
import { startTilt, tilt } from '../lib/tilt';

/**
 * Holographic foil: a soft rainbow band that slowly sweeps across whatever is behind it
 * (the card colour or a cover photo), like a foil bank card catching the light.
 */
export function Holo({ intensity = 0.32 }: { intensity?: number }) {
  const id = useId().replace(/:/g, '');
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [x] = useState(() => new Animated.Value(0));

  // Tilt the phone to move the foil (new build); otherwise it sweeps on its own.
  const [tilting] = useState(() => hasMotion);
  useEffect(() => {
    if (tilting) {
      const stop = startTilt();
      if (stop) return stop;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(x, { toValue: 1, duration: 4200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(x, { toValue: 0, duration: 4200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [x, tilting]);

  const { w, h } = size;
  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}
      onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
    >
      {w > 0 && (
        <Animated.View
          style={{
            position: 'absolute',
            top: 0,
            left: -w,
            width: w * 3,
            height: h,
            opacity: intensity,
            transform: [{ translateX: (tilting ? tilt : x).interpolate({ inputRange: [0, 1], outputRange: [-w * 0.6, w * 0.6] }) }],
          }}
        >
          <Svg width={w * 3} height={h}>
            <Defs>
              <LinearGradient id={`holo${id}`} x1="0" y1="0" x2="1" y2="0.35">
                <Stop offset="0" stopColor="#FF9DE2" stopOpacity="0" />
                <Stop offset="0.2" stopColor="#FF9DE2" />
                <Stop offset="0.32" stopColor="#FFF3A0" />
                <Stop offset="0.42" stopColor="#9DF5FF" />
                <Stop offset="0.48" stopColor="#FFFFFF" />
                <Stop offset="0.54" stopColor="#B49DFF" />
                <Stop offset="0.66" stopColor="#9DFFC9" />
                <Stop offset="0.8" stopColor="#FF9DE2" />
                <Stop offset="1" stopColor="#FF9DE2" stopOpacity="0" />
              </LinearGradient>
            </Defs>
            <Rect x={0} y={0} width={w * 3} height={h} fill={`url(#holo${id})`} />
          </Svg>
        </Animated.View>
      )}
    </View>
  );
}
