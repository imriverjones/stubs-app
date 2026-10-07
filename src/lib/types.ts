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

/** A labelled fact read off the ticket, e.g. { label: 'Seat', value: '14' }. */
export type Detail = { label: string; value: string };

/** One scannable ticket (one person, one entry). */
export type Ticket = {
  id: string;
  /** Rendered page the code came from (or the screenshot itself). */
  pageUri: string;
  code?: Code;
  /** Per-ticket facts: seat, row, coach, passenger. */
  details?: Detail[];
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
  /** Facts shared by every ticket: gate, entrance, venue, booking reference. */
  details?: Detail[];
  reminderId?: string;
  createdAt: number;
  /** Which fields were read off the ticket (shown as a hint on the confirm screen). */
  autofill?: ('date' | 'time' | 'title' | 'kind')[];
};

export type Settings = {
  /** Days after the event before a stub is deleted. 0 = keep forever. */
  keepPastDays: number;
  /** Check new screenshots for ticket codes. undefined = not asked yet. */
  screenshots?: 'on' | 'off';
  /** Pin today's ticket to the lock screen as a Live Activity. */
  lockScreen: boolean;
};

export const DEFAULT_SETTINGS: Settings = { keepPastDays: 30, lockScreen: true };
