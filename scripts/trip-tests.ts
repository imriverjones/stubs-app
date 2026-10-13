// Trip grouping on realistic bookings. Run: npm run test:trips
import { buildTrips, tripDates } from '../src/lib/trips';
import type { Stub } from '../src/lib/types';

let n = 0;
const s = (kind: Stub['kind'], title: string, date: string, extra: Partial<Stub> = {}): Stub =>
  ({ id: `s${++n}`, kind, title, date, tickets: [], sourceUri: '', sourceName: '', pageUris: [], createdAt: 0, ...extra }) as Stub;

const ferryOut = s('ferry', 'Nidri → Kefalonia', '2026-10-17', { time: '09:30' });
const stay = s('stay', 'Olive Grove Cottage', '2026-10-17', { time: '15:00', stay: { address: '12 Odos Agiou, Fiskardo, Kefalonia 28084', checkOutDate: '2026-10-21' } });
const boat = s('activity', 'Sunset Sailing Trip', '2026-10-19');
const ferryBack = s('ferry', 'Kefalonia → Nidri', '2026-10-21', { time: '18:40' });
const londonGig = s('gig', 'Midnight Arcade', '2026-10-30');
const trainOut = s('train', 'Cardiff → London', '2026-11-13');
const theatre = s('event', 'The Glass Garden', '2026-11-13');
const trainBack = s('train', 'London → Cardiff', '2026-11-14');
const lonelyGig = s('gig', 'Another Gig', '2026-11-20');
const lonelyGig2 = s('gig', 'Gig Night Two', '2026-11-21');

let bad = 0;
const expect = (what: string, got: unknown, want: unknown) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) {
    bad++;
    console.log(`✗ ${what}: got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`);
  }
};

const all = [ferryOut, stay, boat, ferryBack, londonGig, trainOut, theatre, trainBack, lonelyGig, lonelyGig2];
let trips = buildTrips(all);
expect('two trips', trips.map((t) => t.name), ['Kefalonia', 'London']);
expect('Kefalonia items', trips[0].items.map((x) => x.title), ['Nidri → Kefalonia', 'Olive Grove Cottage', 'Sunset Sailing Trip', 'Kefalonia → Nidri']);
expect('Kefalonia dates', tripDates(trips[0].start, trips[0].end), '17–21 Oct');
expect('London picks up the theatre', trips[1].items.map((x) => x.title), ['Cardiff → London', 'The Glass Garden', 'London → Cardiff']);
expect('gigs on their own are not a trip', trips.some((t) => t.items.includes(lonelyGig)), false);
expect('a gig between trips stays out', trips.some((t) => t.items.includes(londonGig)), false);

// A stay on its own with something during it is a trip, named after the town.
trips = buildTrips([s('stay', 'Alpine Lodge', '2027-01-10', { stay: { address: 'Seegasse 4, Zell am See, 5700', checkOutDate: '2027-01-17' } }), s('event', 'Ice Race', '2027-01-16')]);
expect('stay + event', trips.map((t) => [t.name, tripDates(t.start, t.end), t.items.length]), [['Zell am See', '10–17 Jan', 2]]);

// The person's fixes win: moved out, moved in, renamed.
const out = { ...boat, noTrip: true };
trips = buildTrips([ferryOut, stay, out, ferryBack]);
expect('taken out of a trip', trips[0].items.some((x) => x.id === boat.id), false);
trips = buildTrips([{ ...ferryOut, tripId: 't1' }, { ...londonGig, tripId: 't1' }, stay, ferryBack], { t1: 'Big weekend' });
expect('manual trip and the rest', trips.map((t) => [t.name, t.manual, t.items.length]), [['Big weekend', true, 2], ['Fiskardo', false, 2]]);
expect('month change', tripDates('2026-10-30', '2026-11-02'), '30 Oct – 2 Nov');

console.log(bad ? `${bad} wrong` : 'All trip checks pass');
process.exit(bad ? 1 : 0);
