import Svg, { Circle, Path } from 'react-native-svg';

const paths = {
  plus: 'M12 5v14M5 12h14',
  back: 'M15 6l-6 6 6 6',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  close: 'M6 6l12 12M18 6L6 18',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  sun: 'M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  settings: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0',
  chevronDown: 'M6 9l6 6 6-6',
  chevronUp: 'M6 15l6-6 6 6',
  doc: 'M7 3h7l5 5v13H7zM14 3v5h5',
  photo: 'M4 5h16v14H4zM4 15l5-5 4 4 3-3 4 4',
} as const;

type Name = keyof typeof paths | 'more';

export function Icon({ name, size = 20, color = '#111', stroke = 2.6 }: { name: Name; size?: number; color?: string; stroke?: number }) {
  if (name === 'more') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Circle cx={5} cy={12} r={2} fill={color} />
        <Circle cx={12} cy={12} r={2} fill={color} />
        <Circle cx={19} cy={12} r={2} fill={color} />
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {name === 'sun' && <Circle cx={12} cy={12} r={4} stroke={color} strokeWidth={stroke} />}
      {name === 'settings' && (
        <>
          <Circle cx={16} cy={6} r={2} stroke={color} strokeWidth={stroke} />
          <Circle cx={10} cy={12} r={2} stroke={color} strokeWidth={stroke} />
          <Circle cx={18} cy={18} r={2} stroke={color} strokeWidth={stroke} />
        </>
      )}
      <Path d={paths[name]} stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
