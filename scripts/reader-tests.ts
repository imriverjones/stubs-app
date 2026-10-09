// Real tickets Stash misread, kept so they stay fixed. Run: npm run test:reader
import { extractDetails, guessKind } from '../src/lib/extract';

const today = new Date(2026, 9, 9);
type Want = { title?: string; kind?: string; date?: string; time?: string | null; company?: string };
const cases: [string, string, Want][] = [
  [
    'SplitSave rail ticket (screenshot)',
    ['17:55', '4G\t43', 'Options\t• SplitSave\tClose', 'Add to Apple Wallet', 'TTB7MYGBHP4', '09 Oct 2026\tSSD - BIS', 'Stansted Airport\tBishops Stortford', 'SSD\t→\tBIS', 'TICKET TYPE\tROUTE', 'Off-Peak Day Single', 'ADULT\tVALID UNTIL', '26-30 Railcard\t09 Oct 2026', 'DATE/TIME PURCHASED', 'Mon 05 Oct at 11:27'].join('\n'),
    { title: 'Stansted Airport → Bishops Stortford', kind: 'train', date: '2026-10-09', time: null, company: 'SplitSave' },
  ],
  [
    'GetYourGuide activity (screenshot, logo not read)',
    ['5:58', 'Your ticket', 'Available offline', 'Tue, Dec 1, 2026\t12:30 pm', 'Ubud: Quad ATV Waterfalls & Barong Caves', 'Tandem Quad Waterfalls & Barong Caves (1', 'voucher for 2 people)', 'group', 'GYGFWVZF739H', 'Show ticket details', 'Add to Apple Wallet'].join('\n'),
    { title: 'Ubud: Quad ATV Waterfalls & Barong Caves', kind: 'activity', date: '2026-12-01', time: '12:30', company: 'GetYourGuide' },
  ],
  [
    'Ferry with a written route',
    ['Ionian Lines', 'Nidri → Kefalonia', 'Departure 14 Nov 2026 09:00', 'Deck passenger'].join('\n'),
    { title: 'Nidri → Kefalonia', kind: 'ferry', date: '2026-11-14', time: '09:00' },
  ],
];

let bad = 0;
for (const [name, text, want] of cases) {
  const got = extractDetails([{ text, codes: 1 }], 1, today);
  const company = got.shared.find((d) => d.label === 'Company')?.value;
  const check: [string, unknown, unknown][] = [
    ['title', got.title, want.title],
    ['kind', got.kind, want.kind],
    ['date', got.date, want.date],
    ['time', got.time ?? null, want.time],
    ['company', company, want.company],
  ];
  for (const [field, g, w] of check) {
    if (w === undefined) continue;
    if (g !== w) {
      bad++;
      console.log(`✗ ${name}: ${field} was ${JSON.stringify(g)}, wanted ${JSON.stringify(w)}`);
    }
  }
}
const kinds: [string, string][] = [
  ['train', 'GWR\nOff-Peak Return\nCardiff Central to London Paddington\nRoute: Any Permitted\nCoach C Seat 42\nAdult ticket'],
  ['flight', 'Ryanair\nBoarding pass\nGate closes 06:20\nSeat 14C'],
  ['event', 'THE BOOK OF MORMON\nPrince of Wales Theatre\nRoyal Circle Row F Seat 12\nTicketmaster'],
  ['gig', 'Ticketmaster\nArctic Monkeys\nDoors open 18:30\nStanding\nO2 Arena'],
  ['ferry', 'Εισιτήριο πλοίο\nΗγουμενίτσα'],
];
for (const [want, text] of kinds) {
  const got = guessKind(text);
  if (got !== want) {
    bad++;
    console.log(`✗ kind: ${JSON.stringify(text.split('\n')[0])} was ${got}, wanted ${want}`);
  }
}
console.log(bad ? `${bad} wrong` : `All ${cases.length + kinds.length} tickets read right`);
process.exit(bad ? 1 : 0);
