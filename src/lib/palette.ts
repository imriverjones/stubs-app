// Colours people can pick for the app and for each ticket. `accent` is the bright colour
// (buttons, ticket screen); `deep` is the dark card behind light text on the home screen.
// Every accent keeps black text readable on it.
export type ColorId = 'orange' | 'pink' | 'blue' | 'green' | 'purple' | 'yellow' | 'red' | 'teal';

export const PALETTE: { id: ColorId; label: string; accent: string; deep: string }[] = [
  { id: 'orange', label: 'Orange', accent: '#FF5A1F', deep: '#111111' },
  { id: 'pink', label: 'Pink', accent: '#FF5FA8', deep: '#3A0F27' },
  { id: 'blue', label: 'Blue', accent: '#4D8DFF', deep: '#0F1E3D' },
  { id: 'green', label: 'Green', accent: '#22C97A', deep: '#0E2E20' },
  { id: 'purple', label: 'Purple', accent: '#9B7BFF', deep: '#1F1645' },
  { id: 'yellow', label: 'Yellow', accent: '#FFC92E', deep: '#2B240A' },
  { id: 'red', label: 'Red', accent: '#FF453A', deep: '#3A0E0C' },
  { id: 'teal', label: 'Teal', accent: '#1FC7C1', deep: '#0B2C2C' },
];

export const paletteColor = (id: ColorId | undefined) => PALETTE.find((p) => p.id === id);

/** The bright colour for a ticket: its own pick, or the app colour. */
export const ticketAccent = (color: ColorId | undefined, appAccent: string) => paletteColor(color)?.accent ?? appAccent;
/** The dark card colour for a ticket on the home screen. */
export const ticketDeep = (color: ColorId | undefined, fallback: string) => paletteColor(color)?.deep ?? fallback;
