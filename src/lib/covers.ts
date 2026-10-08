// Automatic cover photos: looks the event or place up on Wikipedia and uses its main photo,
// only when that photo is freely licensed (Wikimedia Commons), with credit. Opt-in: the only
// thing sent is the search words (e.g. "Fontaines D.C." or "Lefkada").
import { Directory, File, Paths } from 'expo-file-system';
import { getState, isArchived, setCover } from './store';
import type { Stub } from './types';

const API = 'https://en.wikipedia.org/w/api.php';
const HEADERS = { 'Api-User-Agent': 'Stash iOS app (github.com/imriverjones/stubs-app)' };
const COUNTRY = /^(greece|uk|united kingdom|england|scotland|wales|ireland|france|spain|italy|portugal|germany|austria|switzerland|usa|united states)$/i;

/** What to search for, or null when a photo wouldn't help (visas, medical, flight codes). */
export function coverQuery(stub: Stub): string | null {
  if (stub.kind === 'visa' || stub.kind === 'medical' || stub.kind === 'car') return null;
  if (stub.kind === 'stay') {
    const town = stub.stay?.address
      ?.split(',')
      .map((p) => p.replace(/\b[A-Z]{0,2}\s?\d[\d\s-]*[A-Z]{0,2}\b/g, '').replace(/#\S+/g, '').trim())
      .filter((p) => p && !COUNTRY.test(p) && !/\d/.test(p) && p.split(' ').length <= 4)
      .pop();
    return town ?? stub.title.replace(/^stay in\s+/i, '').trim() ?? null;
  }
  // Journeys: the destination. "Nidri → Fiskardo" → "Fiskardo"; skip airport codes.
  const route = stub.title.split(/\s*(?:→|->)\s*/);
  if (route.length === 2) {
    const to = route[1].trim();
    return /^[A-Z]{3}$/.test(to) ? null : to;
  }
  const q = stub.title
    .replace(/\b(19|20)\d{2}\b/g, '')
    .replace(/\b(e-?tickets?|tickets?|admission|entry|booking|order|confirmation)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  return q.length >= 3 && q.toLowerCase() !== 'ticket' && q.toLowerCase() !== 'sample show' ? q : null;
}

type Found = { url: string; credit: string };

const stripHtml = (s: string) => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

/** Best freely licensed lead photo among the top search results. */
export async function findCover(query: string): Promise<Found | null> {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    origin: '*',
    generator: 'search',
    gsrsearch: query,
    gsrlimit: '4',
    prop: 'pageimages',
    piprop: 'thumbnail|name',
    pithumbsize: '1200',
    pilicense: 'free',
  });
  const res = await fetch(`${API}?${params}`, { headers: HEADERS });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    query?: { pages?: Record<string, { index: number; pageimage?: string; thumbnail?: { source: string; width: number; height: number } }> };
  };
  const pages = Object.values(data.query?.pages ?? {})
    .filter((p) => p.thumbnail && p.pageimage && p.thumbnail.width >= 500 && !/\.svg/i.test(p.pageimage))
    .sort((a, b) => a.index - b.index);
  const hit = pages[0];
  if (!hit?.thumbnail || !hit.pageimage) return null;

  // Credit the photographer and licence, as Commons licences ask.
  let credit = 'Wikimedia Commons';
  try {
    const meta = new URLSearchParams({
      action: 'query',
      format: 'json',
      origin: '*',
      titles: `File:${hit.pageimage}`,
      prop: 'imageinfo',
      iiprop: 'extmetadata',
    });
    const r = await fetch(`${API}?${meta}`, { headers: HEADERS });
    const m = (await r.json()) as {
      query?: { pages?: Record<string, { imageinfo?: { extmetadata?: Record<string, { value: string }> }[] }> };
    };
    const info = Object.values(m.query?.pages ?? {})[0]?.imageinfo?.[0]?.extmetadata;
    const artist = info?.Artist ? stripHtml(info.Artist.value).slice(0, 40) : '';
    const licence = info?.LicenseShortName?.value ?? '';
    credit = [artist, licence, 'Wikimedia Commons'].filter(Boolean).join(' · ');
  } catch {}
  return { url: hit.thumbnail.source, credit };
}

/** Find and save a cover for one stub. Returns true if one was set. */
export async function autoCover(stub: Stub, { force = false } = {}): Promise<boolean> {
  if (!force && (stub.cover || stub.coverTried || stub.sample || getState().settings.autoCovers === false)) return false;
  const query = coverQuery(stub);
  try {
    const found = query ? await findCover(query) : null;
    if (!found) {
      if (!force) await setCover(stub.id, null); // remember we looked
      return false;
    }
    const dir = new Directory(Paths.cache, 'covers');
    dir.create({ intermediates: true, idempotent: true });
    const ext = found.url.match(/\.(jpe?g|png|webp)(?:$|\?)/i)?.[1] ?? 'jpg';
    const tmp = new File(dir, `${stub.id}-${Date.now()}.${ext}`);
    await File.downloadFileAsync(found.url, tmp);
    await setCover(stub.id, tmp.uri, { credit: found.credit });
    try {
      tmp.delete();
    } catch {}
    return true;
  } catch {
    return false; // offline: try again another time
  }
}

let running = false;

/** Fill in covers for upcoming tickets that haven't been looked up yet (when turned on). */
export async function backfillCovers() {
  if (running || getState().settings.autoCovers === false) return;
  running = true;
  try {
    const todo = getState().stubs.filter((s) => !s.cover && !s.coverTried && !s.sample && !isArchived(s));
    for (const s of todo.slice(0, 10)) await autoCover(s);
  } finally {
    running = false;
  }
}
