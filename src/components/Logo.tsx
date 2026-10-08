import Svg, { G, Line, Rect, Text as SvgText } from 'react-native-svg';
import { colors, fonts } from '../theme';

/** The Stash mark: an orange ticket stacked on a black one, with a black S. Same as the app icon. */
export function Logo({ size = 44 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityLabel="Stash">
      <G transform="translate(44 47) rotate(-10)">
        <Rect x={-27} y={-36} width={54} height={72} rx={8} fill={colors.ink} />
      </G>
      <G transform="translate(54 51) rotate(6)">
        <Rect x={-28} y={-37} width={56} height={74} rx={8} fill={colors.accent} />
        <SvgText x={0} y={15} fontSize={46} fontFamily={fonts.display} fill={colors.ink} textAnchor="middle">
          S
        </SvgText>
        <Line x1={-22} y1={18.5} x2={23} y2={18.5} stroke="#FFFFFF" strokeWidth={1.4} strokeLinecap="round" strokeDasharray="3.4 2.4" />
      </G>
    </Svg>
  );
}
