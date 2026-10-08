import type { HistoryItem } from './store';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export type Recap = {
  year: number;
  total: number;
  events: number;
  flights: number;
  journeys: number;
  nights: number;
  busiestMonth?: { name: string; count: number };
  places: string[];
};

/** Year in tickets: counts from everything saved that year (including tickets since cleared). */
export function makeRecap(history: HistoryItem[], year: number): Recap {
  const items = history.filter((h) => h.date.startsWith(`${year}-`));
  const byMonth = new Array(12).fill(0) as number[];
  items.forEach((h) => (byMonth[Number(h.date.slice(5, 7)) - 1] += 1));
  const top = byMonth.reduce((best, n, i) => (n > byMonth[best] ? i : best), 0);
  const places = [...new Set(items.map((h) => h.place).filter((p): p is string => !!p))];
  return {
    year,
    total: items.length,
    events: items.filter((h) => h.kind === 'gig' || h.kind === 'event' || h.kind === 'activity').length,
    flights: items.filter((h) => h.kind === 'flight').length,
    journeys: items.filter((h) => h.kind === 'ferry' || h.kind === 'train' || h.kind === 'bus' || h.kind === 'car').length,
    nights: items.filter((h) => h.kind === 'stay').reduce((n, h) => n + (h.nights ?? 1), 0),
    busiestMonth: byMonth[top] > 0 ? { name: MONTHS[top], count: byMonth[top] } : undefined,
    places: places.slice(0, 6),
  };
}

/** Years that have anything in them, newest first. */
export function recapYears(history: HistoryItem[]): number[] {
  return [...new Set(history.map((h) => Number(h.date.slice(0, 4))))].filter(Boolean).sort((a, b) => b - a);
}
