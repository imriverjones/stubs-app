export type Kind = 'ferry' | 'train' | 'flight' | 'bus' | 'gig' | 'event' | 'other';

export const KINDS: { id: Kind; label: string }[] = [
  { id: 'ferry', label: 'Ferry' },
  { id: 'train', label: 'Train' },
  { id: 'flight', label: 'Flight' },
  { id: 'bus', label: 'Bus' },
  { id: 'gig', label: 'Gig' },
  { id: 'event', label: 'Event' },
  { id: 'other', label: 'Other' },
];

export type Code = {
  /** qr | aztec | pdf417 | datamatrix | linear */
  symbology: string;
  payload?: string;
  /** Crop of the code from the original ticket. */
  cropUri: string;
};

/** One scannable ticket (one person, one entry). */
export type Ticket = {
  id: string;
  /** Rendered page the code came from (or the screenshot itself). */
  pageUri: string;
  code?: Code;
};

/** Something you're going to: one date, one or more tickets. */
export type Stub = {
  id: string;
  title: string;
  kind: Kind;
  /** Local calendar day, YYYY-MM-DD. */
  date: string;
  /** Optional local time, HH:mm. */
  time?: string;
  tickets: Ticket[];
  /** Copy of the original PDF/image as it arrived. */
  sourceUri: string;
  sourceName: string;
  /** Every page image, for the "view original" screen. */
  pageUris: string[];
  reminderId?: string;
  createdAt: number;
};

export type Settings = {
  /** Days after the event before a stub is deleted. 0 = keep forever. */
  keepPastDays: number;
};

export const DEFAULT_SETTINGS: Settings = { keepPastDays: 30 };
