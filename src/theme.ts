// Tear-off: paper ground, black ink, one hot accent, poster type for names, mono for details.
export const colors = {
  ground: '#EDEDE9',
  paper: '#FFFFFF',
  paperWarm: '#F7F7F3',
  ink: '#111111',
  inkSoft: '#55554F',
  inkFaint: '#6A6A63',
  rule: '#CFCFC8',
  perforation: '#D9D9D2',
  night: '#111111',
  nightText: '#F4F4F0',
  nightSoft: '#B9B9B2',
  nightRule: '#3A3A36',
  accent: '#FF5A1F',
  danger: '#C8321A',
} as const;

export const fonts = {
  display: 'StubsDisplay',
  body: 'SpaceGrotesk_400Regular',
  bodyMedium: 'SpaceGrotesk_500Medium',
  bodyBold: 'SpaceGrotesk_700Bold',
  mono: 'SpaceMono_400Regular',
  monoBold: 'SpaceMono_700Bold',
} as const;

export const label = {
  fontFamily: fonts.mono,
  fontSize: 12,
  letterSpacing: 1.6,
  textTransform: 'uppercase' as const,
  color: colors.inkSoft,
};
