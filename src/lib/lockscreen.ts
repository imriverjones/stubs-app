import { File } from 'expo-file-system';
import { Platform } from 'react-native';
import { dayKey, toDate } from './dates';
import { getState, setLockCard } from './store';
import { KINDS, type Detail, type Stub } from './types';

type Activity = typeof import('../live/TicketActivity').default;

/** Loaded lazily so the app still runs where Live Activities aren't available. */
function activity(): Activity | null {
  if (Platform.OS !== 'ios') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- loaded lazily so non-iOS builds don't touch it
    return require('../live/TicketActivity').default as Activity;
  } catch {
    return null;
  }
}

function widgetsDir(): string | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- loaded lazily, see above
    return (require('expo-widgets') as typeof import('expo-widgets')).widgetsDirectory || null;
  } catch {
    return null;
  }
}

/** How long after the start time the card stays up. */
const LINGER_MS = 3 * 60 * 60 * 1000;

/** Today's stub that should be on the lock screen right now, if any. */
function pick(stubs: Stub[]): Stub | null {
  const today = dayKey();
  const now = Date.now();
  const candidates = stubs.filter((s) => {
    if (s.date !== today || s.usedAt) return false;
    if (!s.time) return true;
    return toDate(s.date, s.time).getTime() + LINGER_MS > now;
  });
  // Earliest timed one first; all-day tickets after.
  candidates.sort((a, b) => (a.time ?? '99:99').localeCompare(b.time ?? '99:99'));
  return candidates[0] ?? null;
}

const LOCK_LABELS = ['Seat', 'Group', 'Row', 'Section', 'Block', 'Gate', 'Gate closes', 'Entrance', 'Door', 'Platform', 'Coach', 'Deck', 'Cabin'];

export function summary(details: Detail[] | undefined, max = 2): string {
  if (!details?.length) return '';
  const ordered = [...details].sort((a, b) => {
    const ia = LOCK_LABELS.indexOf(a.label);
    const ib = LOCK_LABELS.indexOf(b.label);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
  return ordered
    .filter((d) => LOCK_LABELS.includes(d.label))
    .slice(0, max)
    .map((d) => `${d.label} ${d.value}`)
    .join(' · ');
}

/** Copy the first ticket's code image somewhere the Live Activity can read it. */
async function codeImage(stub: Stub): Promise<string> {
  const dir = widgetsDir();
  const crop = stub.tickets.find((t) => t.code?.cropUri)?.code?.cropUri;
  if (!dir || !crop) return '';
  try {
    const dest = new File(dir.endsWith('/') ? dir : `${dir}/`, `code-${stub.id}.png`);
    if (!dest.exists) await new File(crop).copy(dest);
    return dest.uri;
  } catch {
    return '';
  }
}

async function propsFor(stub: Stub) {
  const kind = KINDS.find((k) => k.id === stub.kind)?.label ?? 'Ticket';
  const n = stub.tickets.length;
  const first = stub.tickets[0];
  return {
    title: stub.title.toUpperCase(),
    label: `${kind}${n > 1 ? ` · ${n} TICKETS` : ''}`.toUpperCase(),
    when: stub.time ?? 'Today',
    detail: summary([...(first?.details ?? []), ...(stub.details ?? [])]),
    code: await codeImage(stub),
  };
}

let syncing = false;

/**
 * Keeps the lock screen card in step with today's tickets. iOS only lets an app start a
 * Live Activity while it's open, so this runs on launch, on returning to the app, and
 * whenever tickets change (opening the morning reminder counts as opening the app).
 */
export async function syncLockScreen() {
  const Factory = activity();
  if (!Factory || syncing) return;
  syncing = true;
  try {
    const { stubs, settings } = getState();
    const target = settings.lockScreen ? pick(stubs) : null;
    const running = Factory.getInstances();
    const remembered = getState().lockCard;
    let current = null as (typeof running)[number] | null;

    for (const inst of running) {
      const isOurs = remembered && inst.getId() === remembered.activityId && remembered.stubId === target?.id;
      if (isOurs && !current) {
        current = inst;
      } else {
        await inst.end('immediate');
      }
    }

    if (!target) {
      if (remembered) setLockCard(null);
      return;
    }

    const ends = target.time
      ? new Date(toDate(target.date, target.time).getTime() + LINGER_MS)
      : toDate(target.date, '23:59');

    if (current) {
      await current.update(await propsFor(target), ends);
    } else {
      const started = Factory.start(await propsFor(target), `stubs://ticket/${target.id}`, ends);
      setLockCard({ activityId: started.getId(), stubId: target.id });
    }
  } catch (e) {
    console.warn('Lock screen card not updated', e);
  } finally {
    syncing = false;
  }
}
