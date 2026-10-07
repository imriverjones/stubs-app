// Reads the useful bits off a ticket's text: event date and time, seat, gate, platform,
// booking reference and so on. Pure functions, no I/O, so it's easy to test.
import type { Detail, Kind } from './types';

/** A page's text and how many tickets the importer made from it. */
export type PageText = { text: string; codes: number };

export type Extracted = {
  date?: string; // YYYY-MM-DD
  time?: string; // HH:mm
  kind?: Kind;
  title?: string;
  /** Facts that apply to every ticket (gate, platform, booking ref, doors). */
  shared: Detail[];
  /** One list per ticket, in the order the tickets were found. */
  perTicket: Detail[][];
};

// ---------- labels ----------

type LabelDef = { label: string; words: string[]; perTicket?: boolean; value?: RegExp; wordValues?: boolean };

const SHORT = /^[A-Z0-9][A-Z0-9/-]{0,7}$/i; // "14", "F", "112", "A-12", "3/4"
const REF = /^[A-Z0-9][A-Z0-9-]{4,19}$/i; // "KX4-82Q1", "8F3QLJ7"
const TIME_VALUE = /^\d{1,2}[:.]\d{2}(\s?[ap]\.?m\.?)?$/i;

const LABELS: LabelDef[] = [
  { label: 'Seat', words: ['seat', 'seat no', 'seat number', 'sitz', 'sitzplatz', 'platz', 'posto', 'asiento', 'siège', 'place', 'θέση'], perTicket: true },
  { label: 'Row', words: ['row', 'reihe', 'fila', 'rang', 'σειρά'], perTicket: true },
  { label: 'Section', wordValues: true, words: ['section', 'sec', 'sector', 'sektor', 'settore', 'stand', 'tribune', 'tribüne'], perTicket: true },
  { label: 'Block', wordValues: true, words: ['block', 'bloc', 'blocco', 'area', 'zone', 'zona'], perTicket: true },
  { label: 'Coach', words: ['coach', 'carriage', 'car', 'wagen', 'carrozza', 'voiture', 'coche'], perTicket: true },
  { label: 'Cabin', words: ['cabin', 'kabine', 'cabina', 'καμπίνα'], perTicket: true },
  { label: 'Berth', words: ['berth', 'bed'], perTicket: true },
  { label: 'Gate', wordValues: true, words: ['gate', 'tor', 'porta', 'puerta', 'πύλη'] },
  { label: 'Entrance', wordValues: true, words: ['entrance', 'entry', 'enter via', 'use entrance', 'eingang', 'ingresso', 'entrada', 'entrée', 'είσοδος'] },
  { label: 'Door', wordValues: true, words: ['door', 'turnstile', 'portal', 'vomitory'] },
  { label: 'Platform', words: ['platform', 'gleis', 'binario', 'andén', 'quai'] },
  { label: 'Deck', wordValues: true, words: ['deck', 'class'] },
  { label: 'Doors', words: ['doors', 'doors open', 'gates open', 'einlass', 'boarding', 'boarding time', 'check-in closes'], value: TIME_VALUE },
  {
    label: 'Ref',
    words: ['booking reference', 'booking ref', 'booking no', 'booking number', 'booking code', 'reference', 'ref', 'order', 'order no', 'order number', 'confirmation', 'confirmation code', 'pnr', 'reservation', 'reservation no', 'ticket no', 'ticket number', 'buchungsnummer', 'κωδικός κράτησης'],
    value: REF,
  },
];

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Longest words first so "booking reference" wins over "reference".
const WORD_INDEX = LABELS.flatMap((def) => def.words.map((w) => ({ def, w })))
  .sort((a, b) => b.w.length - a.w.length)
  .map(({ def, w }) => ({ def, re: new RegExp(`^${escapeRe(w)}\\.?\\s*(?:no\\.?|#|nr\\.?)?\\s*[:#.\\-–]?\\s*`, 'i') }));

const WORD_TO_DEF = new Map(LABELS.flatMap((def) => def.words.map((w) => [w.toLowerCase(), def] as const)));
const ALL_WORDS = [...WORD_TO_DEF.keys()].sort((a, b) => b.length - a.length).map(escapeRe).join('|');
const INLINE_RE = new RegExp(`(?<![\\p{L}])(${ALL_WORDS})(?![\\p{L}])\\.?(?:\\s*(?:(?:no|nr)(?![\\p{L}])\\.?|#))?\\s*[:#\\-–]?\\s*`, 'giu');
const INLINE_RE_TEST = new RegExp(`(?<![\\p{L}])(${ALL_WORDS})(?![\\p{L}])`, 'iu');

function labelAt(cell: string): { def: LabelDef; rest: string } | null {
  const c = cell.trim();
  for (const { def, re } of WORD_INDEX) {
    const m = c.match(re);
    if (m) {
      const rest = c.slice(m[0].length).trim();
      // "Section" must be the whole word, not the start of "Sections apply"
      if (rest && /^[a-z]/.test(rest) && !/^[a-z]{1,2}\d/i.test(rest) && rest.length > 3 && /[a-z]{3}/.test(rest)) continue;
      return { def, rest };
    }
  }
  return null;
}

const STOP = new Set(
  'the and via at of in on for to from by is are be this that your you with open opens opening closes closed fee fees number information details detail time date only please see free all any none here there per'.split(' '),
);

function cleanValue(def: LabelDef, raw: string): string | null {
  let v = raw.trim().replace(/^[:#.\-–\s]+/, '').split(/\s{2,}|\t/)[0].trim();
  if (def.value === TIME_VALUE) {
    const t = parseTime(v);
    return t ?? null;
  }
  if (def.value === REF) {
    v = v.split(/\s/)[0];
    return REF.test(v) && /\d/.test(v) ? v.toUpperCase() : null;
  }
  // Keep things like "Upper Tier 2" short; most values are one token.
  const first = v.split(/\s+/).slice(0, 2).join(' ');
  const token = SHORT.test(v.split(/\s+/)[0]) ? v.split(/\s+/)[0] : first;
  if (!token || token.length > 12) return null;
  if (/^(no|number|nr|n\/a|na|-|tbc|tba)$/i.test(token)) return null;
  const isWord = /^\p{L}{2,12}$/u.test(token) && !STOP.has(token.toLowerCase());
  if (!/\d/.test(token) && !/^[A-Z]{1,3}$/.test(token) && !(def.wordValues && isWord)) return null;
  // "CIRCLE" → "Circle", but keep codes like "C", "23A", "AB".
  if (/^\p{L}{4,}$/u.test(token)) return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
  return token;
}

/** All label/value pairs on a page, in reading order. */
function findDetails(text: string): Detail[] {
  const out: Detail[] = [];
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  for (let i = 0; i < lines.length; i++) {
    const cells = lines[i].split(/\t|\s{3,}|\s\|\s/).map((c) => c.trim()).filter(Boolean);
    const labels = cells.map(labelAt);

    // Header row of labels with a row of values below: "SECTION  ROW  SEAT" / "112  F  14"
    if (labels.length > 1 && labels.every((l) => l && !l.rest) && i + 1 < lines.length) {
      const values = lines[i + 1].split(/\t|\s{2,}|\s\|\s/).map((c) => c.trim()).filter(Boolean);
      if (values.length === labels.length) {
        labels.forEach((l, k) => {
          const v = cleanValue(l!.def, values[k]);
          if (v) out.push({ label: l!.def.label, value: v });
        });
        i++;
        continue;
      }
    }

    // Every label on the line, each taking the text up to the next label as its value:
    // "Row G Seat 5", "Dep 08:15  Platform 4", "Coach C\tSeat 42".
    const hits = [...lines[i].matchAll(INLINE_RE)];
    hits.forEach((m, k) => {
      const def = WORD_TO_DEF.get(m[1].toLowerCase());
      if (!def) return;
      const startV = (m.index ?? 0) + m[0].length;
      const endV = k + 1 < hits.length ? hits[k + 1].index ?? lines[i].length : lines[i].length;
      let v = cleanValue(def, lines[i].slice(startV, endV));
      // Label alone at the end of a line: value on the next line, if that line isn't labels.
      if (!v && k === hits.length - 1 && !lines[i].slice(startV).trim() && lines[i + 1] && !INLINE_RE_TEST.test(lines[i + 1])) {
        v = cleanValue(def, lines[i + 1]);
      }
      if (v) out.push({ label: def.label, value: v });
    });
  }
  return out;
}

// ---------- dates and times ----------

const MONTHS: Record<string, number> = {
  jan: 1, january: 1, januar: 1, gennaio: 1, enero: 1, janvier: 1,
  feb: 2, february: 2, februar: 2, febbraio: 2, febrero: 2, février: 2,
  mar: 3, march: 3, märz: 3, marzo: 3, mars: 3,
  apr: 4, april: 4, aprile: 4, abril: 4, avril: 4,
  may: 5, mai: 5, maggio: 5, mayo: 5,
  jun: 6, june: 6, juni: 6, giugno: 6, junio: 6, juin: 6,
  jul: 7, july: 7, juli: 7, luglio: 7, julio: 7, juillet: 7,
  aug: 8, august: 8, agosto: 8, août: 8,
  sep: 9, sept: 9, september: 9, settembre: 9, septiembre: 9, septembre: 9,
  oct: 10, october: 10, okt: 10, oktober: 10, ottobre: 10, octubre: 10, octobre: 10,
  nov: 11, november: 11, novembre: 11, noviembre: 11,
  dec: 12, december: 12, dez: 12, dezember: 12, dicembre: 12, diciembre: 12, décembre: 12,
};
const MONTH_RE = Object.keys(MONTHS).sort((a, b) => b.length - a.length).join('|');

const GOOD_CONTEXT = /\b(date|event|departure|depart|departs|travel|journey|valid|show|performance|match|kick.?off|doors|start|on|sailing|outbound|arrival|datum|data|fecha|ημερομηνία)\b/i;
const BAD_CONTEXT = /\b(issued|purchased|purchase|bought|order(ed)?\s*date|booking\s*date|booked|printed|created|transaction|invoice|payment|paid|generated|expires|expiry|dob|birth)\b/i;

const pad = (n: number) => String(n).padStart(2, '0');

function validDate(y: number, m: number, d: number) {
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const dt = new Date(y, m - 1, d);
  return dt.getMonth() === m - 1 ? `${y}-${pad(m)}-${pad(d)}` : null;
}

function fullYear(y: string | undefined, m: number, d: number, today: Date): number {
  if (y) return y.length === 2 ? 2000 + Number(y) : Number(y);
  // No year printed: the next time that day comes round.
  const thisYear = today.getFullYear();
  const candidate = new Date(thisYear, m - 1, d);
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return candidate < startOfToday ? thisYear + 1 : thisYear;
}

type DateHit = { date: string; line: number; score: number };

function findDates(lines: string[], today: Date): DateHit[] {
  const hits: DateHit[] = [];
  const add = (date: string | null, line: number) => {
    if (!date) return;
    const l = lines[line];
    let score = 0;
    if (GOOD_CONTEXT.test(l) || (line > 0 && GOOD_CONTEXT.test(lines[line - 1]) && lines[line - 1].length < 30)) score += 2;
    if (BAD_CONTEXT.test(l) || (line > 0 && BAD_CONTEXT.test(lines[line - 1]) && lines[line - 1].length < 30)) score -= 5;
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const t = new Date(date).getTime();
    if (t >= start - 86_400_000) score += 1; // upcoming beats past
    if (t > start + 2 * 365 * 86_400_000) score -= 2; // far future is likely an expiry
    hits.push({ date, line, score });
  };

  lines.forEach((l, i) => {
    let m: RegExpExecArray | null;
    // 2027-04-14
    const iso = /\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/g;
    while ((m = iso.exec(l))) add(validDate(+m[1], +m[2], +m[3]), i);
    // 14/04/2027, 14.04.27, 14-04-2027 (day first; month first only when it's the only valid reading)
    const num = /\b(\d{1,2})[./-](\d{1,2})[./-](\d{2}|\d{4})\b/g;
    while ((m = num.exec(l))) {
      const a = +m[1], b = +m[2];
      const y = m[3].length === 2 ? 2000 + +m[3] : +m[3];
      add(a > 12 || b <= 12 ? validDate(y, b, a) : validDate(y, a, b), i);
    }
    // 14 Apr 2027, Wed 14th April, 14. April 2027
    const dm = new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th|\\.)?\\s+(${MONTH_RE})\\.?,?(?:\\s+(\\d{4}|'?\\d{2}))?\\b`, 'gi');
    while ((m = dm.exec(l))) {
      const d = +m[1], mo = MONTHS[m[2].toLowerCase()];
      const y = m[3]?.replace("'", '');
      add(validDate(fullYear(y, mo, d, today), mo, d), i);
    }
    // April 14, 2027 / Apr 14th
    const md = new RegExp(`\\b(${MONTH_RE})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?,?(?:\\s+(\\d{4}))?\\b`, 'gi');
    while ((m = md.exec(l))) {
      const mo = MONTHS[m[1].toLowerCase()], d = +m[2];
      add(validDate(fullYear(m[3], mo, d, today), mo, d), i);
    }
  });
  return hits;
}

function parseTime(s: string): string | null {
  const m = s.match(/\b(\d{1,2})[:.h](\d{2})\s*(a\.?m\.?|p\.?m\.?)?(?![\d.])/i);
  if (!m) return null;
  let h = +m[1];
  const min = +m[2];
  const ap = m[3]?.toLowerCase().replace(/\./g, '');
  if (ap === 'pm' && h < 12) h += 12;
  if (ap === 'am' && h === 12) h = 0;
  if (h > 23 || min > 59) return null;
  return `${pad(h)}:${pad(min)}`;
}

const TIME_GOOD = /\b(depart|departure|departs|dep|start|starts|show|kick.?off|performance|time|sailing|boarding|abfahrt|partenza|salida|αναχώρηση)\b/i;
const TIME_DOORS = /\b(doors|gates open|einlass|check.?in)\b/i;

function findTime(lines: string[], dateLine: number | undefined): string | undefined {
  const timeOn = (l: string) => (BAD_CONTEXT.test(l) ? null : parseTime(l));
  // Same line as the event date, or just below it.
  if (dateLine != null) {
    for (const i of [dateLine, dateLine + 1, dateLine + 2]) {
      const l = lines[i];
      if (l && !TIME_DOORS.test(l)) {
        const t = timeOn(l);
        if (t) return t;
      }
    }
  }
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (TIME_GOOD.test(l) && !TIME_DOORS.test(l)) {
      const t = timeOn(l) ?? (l.length < 30 ? timeOn(lines[i + 1] ?? '') : null);
      if (t) return t;
    }
  }
  return undefined;
}

// ---------- kind and title ----------

function guessKind(text: string): Kind | undefined {
  const t = text.toLowerCase();
  if (/\b(ferry|ferries|vessel|port|sailing|deck|ship|ναυτιλ|πλοίο)\b/.test(t)) return 'ferry';
  if (/\b(boarding pass|flight|airline|terminal)\b/.test(t)) return 'flight';
  if (/\b(train|rail|railway|platform|coach [a-z]\b|carriage|bahn|trenitalia|eurostar)\b/.test(t)) return 'train';
  if (/\b(bus|ktel|flixbus|national express|megabus)\b/.test(t)) return 'bus';
  if (/\b(concert|gig|tour|live|festival|doors open|support act|arena|academy)\b/.test(t)) return 'gig';
  if (/\b(admission|entry|museum|park|tickets?)\b/.test(t)) return 'event';
  return undefined;
}

function findRoute(lines: string[]): string | undefined {
  let from: string | undefined;
  let to: string | undefined;
  const place = (s: string) => {
    const v = s.replace(/^[:\-–\s]+/, '').split(/\t|\s{2,}|\d{1,2}[:.]\d{2}|\(/)[0].trim();
    return v.length >= 3 && v.length <= 30 && /^[\p{L}][\p{L} .'-]+$/u.test(v) ? v : undefined;
  };
  lines.forEach((l, i) => {
    const f = l.match(/^(from|departure port|origin|von|da|desde|από)\b[:\s]*(.*)$/i);
    const t = l.match(/^(to|arrival port|destination|nach|a|hasta|προς)\b[:\s]*(.*)$/i);
    if (f && !from) from = place(f[2]) ?? place(lines[i + 1] ?? '');
    if (t && !to) to = place(t[2]) ?? place(lines[i + 1] ?? '');
    const arrow = l.match(/^([\p{L} .'-]{3,30}?)\s*(?:→|->|>)\s*([\p{L} .'-]{3,30})$/u) ?? l.match(/^([\p{L} .'-]{3,30}?)\s+(?:–|—|-|to)\s+([\p{L} .'-]{3,30})$/u);
    if (arrow && !from && !to && /[A-Z]/.test(arrow[1][0])) {
      from = place(arrow[1]);
      to = place(arrow[2]);
    }
  });
  return from && to ? `${titleCase(from)} → ${titleCase(to)}` : undefined;
}

const titleCase = (s: string) =>
  s === s.toUpperCase() ? s.toLowerCase().replace(/(^|[\s-])\p{L}/gu, (c) => c.toUpperCase()) : s;

// ---------- main ----------

const uniq = (ds: Detail[]) => {
  const seen = new Set<string>();
  return ds.filter((d) => {
    const k = `${d.label}|${d.value}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
};

const PER_TICKET = new Set(LABELS.filter((l) => l.perTicket).map((l) => l.label));

/**
 * @param pages each page's text and how many codes were found on it, in order
 * @param ticketCount total tickets the importer created
 */
export function extractDetails(pages: PageText[], ticketCount: number, today = new Date()): Extracted {
  const allText = pages.map((p) => p.text).join('\n');
  const lines = allText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  const dates = findDates(lines, today);
  dates.sort((a, b) => b.score - a.score || a.date.localeCompare(b.date));
  const best = dates[0] && dates[0].score >= 0 ? dates[0] : undefined;
  const time = findTime(lines, best?.line);

  // Details per page, then split into shared and per-ticket.
  const pageDetails = pages.map((p) => uniq(findDetails(p.text)));
  const shared: Detail[] = [];
  const perTicket: Detail[][] = [];

  pages.forEach((p, i) => {
    const ds = pageDetails[i];
    const mine = ds.filter((d) => PER_TICKET.has(d.label));
    ds.filter((d) => !PER_TICKET.has(d.label)).forEach((d) => {
      if (!shared.some((s) => s.label === d.label)) shared.push(d);
    });
    const slots = p.codes;
    if (!slots) return;
    // Several codes on one page: hand out each label's values in order if the counts match.
    const byLabel = new Map<string, string[]>();
    mine.forEach((d) => byLabel.set(d.label, [...(byLabel.get(d.label) ?? []), d.value]));
    for (let k = 0; k < slots; k++) {
      const list: Detail[] = [];
      byLabel.forEach((values, label) => {
        if (values.length === slots) list.push({ label, value: values[k] });
        else if (values.length === 1) list.push({ label, value: values[0] });
      });
      perTicket.push(list);
    }
  });
  while (perTicket.length < ticketCount) perTicket.push([]);

  // No start time printed: use doors/boarding so the reminder still lands sensibly.
  const doors = shared.find((d) => d.label === 'Doors');
  const startTime = time ?? doors?.value;
  if (doors && doors.value === startTime) shared.splice(shared.indexOf(doors), 1);

  return {
    date: best?.date,
    time: startTime,
    kind: guessKind(allText),
    title: findRoute(lines),
    shared,
    perTicket: perTicket.slice(0, ticketCount),
  };
}
