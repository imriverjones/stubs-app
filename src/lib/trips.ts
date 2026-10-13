// Trips: tickets and stays that belong to the same journey, grouped automatically.
// Travel (flights, ferries, trains, buses, hire cars) and stays close together in time form a trip;
// anything else happening during it joins. People can fix the grouping: once they do, those items
// carry a tripId and are grouped by that instead. Pure functions, no I/O, so it's easy to test.
import { daysBetween } from './dates';
import type { Kind, Stub } from './types';

export type Trip = {
  id: string;
  name: string;
  /** First and last day, YYYY-MM-DD. */
  start: string;
  end: string;
  /** In date order. */
  items: Stub[];
  /** Grouped by the person rather than guessed. */
  manual: boolean;
};

const TRAVEL: Kind[] = ['flight', 'ferry', 'train', 'bus', 'car'];
/** Days allowed between one leg and the next before it counts as a separate trip. */
const GAP_DAYS = 2;

const lastDayOf = (s: Stub) => {
  const out = s.kind === 'stay' ? s.stay?.checkOutDate : undefined;
  return out && out > s.date ? out : s.date;
};
const byTime = (a: Stub, b: Stub) =>
  a.date === b.date ? (a.time ?? '99:99').localeCompare(b.time ?? '99:99') : a.date.localeCompare(b.date);

/** "Cardiff → London" → "London". */
const routeEnd = (title: string) => {
  const parts = title.split(/\s*(?:→|->|–|—| to )\s*/);
  return parts.length > 1 ? parts[parts.length - 1].trim() : undefined;
};
/** The town from a stay's address: "12 Odos Agiou, Nidri, Lefkada 31100" → "Nidri". */
const townOf = (address?: string) => {
  const parts = (address ?? '').split(',').map((p) => p.replace(/\b[A-Z]{1,2}\d[\dA-Z]?\s*\d[A-Z]{2}\b|\b\d{4,6}\b/g, '').trim()).filter(Boolean);
  if (parts.length < 2) return undefined;
  const town = parts.find((p, i) => i > 0 && !/\d/.test(p) && p.length >= 3);
  return town;
};

/** Where the trip goes: where the first leg takes you, or the place you're staying. */
export function tripName(items: Stub[]): string {
  const first = items[0];
  if (first && TRAVEL.includes(first.kind) && routeEnd(first.title)) return routeEnd(first.title)!;
  const stay = items.find((s) => s.kind === 'stay');
  if (stay) return townOf(stay.stay?.address) ?? stay.title;
  // Only the way home is here: name it after where you were.
  const leg = items.find((s) => TRAVEL.includes(s.kind) && routeEnd(s.title));
  if (leg) return leg.title.split(/\s*(?:→|->|–|—| to )\s*/)[0].trim();
  return first?.title ?? 'Trip';
}

/** Groups live stubs into trips. Stubs not in a trip are left out. */
export function buildTrips(stubs: Stub[], names: Record<string, string> = {}): Trip[] {
  const trips: Trip[] = [];
  const make = (id: string, items: Stub[], manual: boolean) => {
    const sorted = [...items].sort(byTime);
    const start = sorted[0].date;
    const end = sorted.reduce((e, s) => (lastDayOf(s) > e ? lastDayOf(s) : e), start);
    trips.push({ id, name: names[id] || tripName(sorted), start, end, items: sorted, manual });
  };

  // Trips the person made or fixed.
  const manual = new Map<string, Stub[]>();
  for (const s of stubs) if (s.tripId) manual.set(s.tripId, [...(manual.get(s.tripId) ?? []), s]);
  manual.forEach((items, id) => make(id, items, true));

  // Automatic: chain travel and stays that are close together.
  const free = stubs.filter((s) => !s.tripId && !s.noTrip).sort(byTime);
  const anchors = free.filter((s) => s.kind === 'stay' || TRAVEL.includes(s.kind));
  const clusters: { items: Stub[]; end: string }[] = [];
  for (const s of anchors) {
    const last = clusters[clusters.length - 1];
    if (last && daysBetween(last.end, s.date) <= GAP_DAYS) {
      last.items.push(s);
      if (lastDayOf(s) > last.end) last.end = lastDayOf(s);
    } else clusters.push({ items: [s], end: lastDayOf(s) });
  }
  // A trip needs more than one thing in it, and at least one of them must take you somewhere
  // (two concerts a day apart aren't a trip; a ferry plus a stay is).
  const real = clusters.filter((c) => c.items.length > 1 || c.items[0].kind === 'stay');
  // Anything else during the trip (the gig, the boat trip) joins it.
  for (const s of free) {
    if (s.kind === 'stay' || TRAVEL.includes(s.kind)) continue;
    const c = real.find((c) => s.date >= c.items[0].date && s.date <= c.end);
    if (c) c.items.push(s);
  }
  for (const c of real) if (c.items.length > 1) make(`auto:${c.items[0].id}`, c.items, false);

  return trips.sort((a, b) => a.start.localeCompare(b.start));
}

/** "17–21 Oct", "30 Oct – 2 Nov", "28 Dec – 3 Jan". */
export function tripDates(start: string, end: string): string {
  const M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const [, sm, sd] = start.split('-').map(Number);
  const [, em, ed] = end.split('-').map(Number);
  if (start === end) return `${sd} ${M[sm - 1]}`;
  if (sm === em) return `${sd}–${ed} ${M[sm - 1]}`;
  return `${sd} ${M[sm - 1]} – ${ed} ${M[em - 1]}`;
}

/** Nights away, counting from the first day to the last. */
export const tripNights = (t: Pick<Trip, 'start' | 'end'>) => Math.max(0, daysBetween(t.start, t.end));

