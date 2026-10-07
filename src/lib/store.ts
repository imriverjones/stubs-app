import { useSyncExternalStore } from 'react';
import { addDays, dayKey } from './dates';
import { dbFile, deleteStubFiles } from './files';
import { cancelReminder, ensurePermission, scheduleReminder } from './reminders';
import { DEFAULT_SETTINGS, type Settings, type Stub } from './types';

type State = {
  loaded: boolean;
  stubs: Stub[];
  settings: Settings;
  /** A scanned import waiting on the confirm screen. */
  draft: Stub | null;
  /** Screenshot ids already checked, so each is only offered once. */
  seenShots: string[];
  /** The lock screen card currently showing, and which stub it belongs to. */
  lockCard: { activityId: string; stubId: string } | null;
};

let state: State = { loaded: false, stubs: [], settings: DEFAULT_SETTINGS, draft: null, seenShots: [], lockCard: null };
const listeners = new Set<() => void>();

function set(patch: Partial<State>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useStore<T>(select: (s: State) => T): T {
  return useSyncExternalStore(subscribe, () => select(state));
}

export const getState = () => state;

// ---------- persistence ----------

function persist() {
  try {
    dbFile().write(JSON.stringify({ v: 1, stubs: state.stubs, settings: state.settings, seenShots: state.seenShots, lockCard: state.lockCard }));
  } catch (e) {
    console.warn('Could not save stubs', e);
  }
}

export async function load() {
  if (state.loaded) return;
  let stubs: Stub[] = [];
  let settings = DEFAULT_SETTINGS;
  let seenShots: string[] = [];
  let lockCard: State['lockCard'] = null;
  try {
    const file = dbFile();
    if (file.exists) {
      const data = JSON.parse(await file.text());
      stubs = Array.isArray(data.stubs) ? data.stubs : [];
      settings = { ...DEFAULT_SETTINGS, ...(data.settings ?? {}) };
      seenShots = Array.isArray(data.seenShots) ? data.seenShots : [];
      lockCard = data.lockCard ?? null;
    }
  } catch (e) {
    console.warn('Could not read stubs', e);
  }
  set({ loaded: true, stubs: sortStubs(stubs), settings, seenShots, lockCard });
  cleanUp();
}

function sortStubs(stubs: Stub[]) {
  return [...stubs].sort((a, b) =>
    a.date === b.date ? (a.time ?? '99:99').localeCompare(b.time ?? '99:99') : a.date.localeCompare(b.date),
  );
}

// ---------- drafts ----------

export function setDraft(draft: Stub | null) {
  const old = state.draft;
  if (old && old.id !== draft?.id) deleteStubFiles(old.id);
  set({ draft });
}

/** Throw away the draft and its scanned files. */
export function discardDraft() {
  setDraft(null);
}

// ---------- stubs ----------

export async function saveDraft(fields: Pick<Stub, 'title' | 'kind' | 'date' | 'time'>) {
  const draft = state.draft;
  if (!draft) return null;
  const stub: Stub = { ...draft, ...fields, title: fields.title.trim() || 'Ticket', createdAt: Date.now() };
  stub.reminderId = await scheduleReminder(stub);
  set({ draft: null, stubs: sortStubs([...state.stubs, stub]) });
  persist();
  return stub;
}

export async function updateStub(id: string, fields: Partial<Pick<Stub, 'title' | 'kind' | 'date' | 'time'>>) {
  const current = state.stubs.find((s) => s.id === id);
  if (!current) return;
  await cancelReminder(current.reminderId);
  const next: Stub = { ...current, ...fields };
  next.reminderId = await scheduleReminder(next);
  set({ stubs: sortStubs(state.stubs.map((s) => (s.id === id ? next : s))) });
  persist();
}

const pendingDeletes = new Map<string, { stub: Stub; timer: ReturnType<typeof setTimeout> }>();

/** Removes straight away from the list; files go after a few seconds unless undone. */
export function removeStub(id: string): () => void {
  const stub = state.stubs.find((s) => s.id === id);
  if (!stub) return () => {};
  cancelReminder(stub.reminderId);
  set({ stubs: state.stubs.filter((s) => s.id !== id) });
  persist();

  const timer = setTimeout(() => {
    pendingDeletes.delete(id);
    deleteStubFiles(id);
  }, 8000);
  pendingDeletes.set(id, { stub, timer });

  return async () => {
    const pending = pendingDeletes.get(id);
    if (!pending) return;
    clearTimeout(pending.timer);
    pendingDeletes.delete(id);
    const restored = { ...pending.stub, reminderId: await scheduleReminder(pending.stub) };
    set({ stubs: sortStubs([...state.stubs, restored]) });
    persist();
  };
}

/** Delete every stub whose day has passed. */
export function clearPast() {
  const today = dayKey();
  const past = state.stubs.filter((s) => s.date < today);
  past.forEach((s) => {
    cancelReminder(s.reminderId);
    deleteStubFiles(s.id);
  });
  set({ stubs: state.stubs.filter((s) => s.date >= today) });
  persist();
}

/** Delete stubs older than the "keep past tickets" setting. */
export function cleanUp() {
  const days = state.settings.keepPastDays;
  if (!days) return;
  const cutoff = addDays(dayKey(), -days);
  const expired = state.stubs.filter((s) => s.date < cutoff);
  if (!expired.length) return;
  expired.forEach((s) => deleteStubFiles(s.id));
  set({ stubs: state.stubs.filter((s) => s.date >= cutoff) });
  persist();
}

export function setSettings(patch: Partial<Settings>) {
  set({ settings: { ...state.settings, ...patch } });
  persist();
  cleanUp();
}

/**
 * Asks for notification permission if there are upcoming tickets, then schedules any
 * reminder that's missing (e.g. tickets saved before permission was given).
 */
export async function ensureReminders() {
  const upcoming = state.stubs.filter((s) => s.date >= dayKey());
  if (!upcoming.length || !(await ensurePermission())) return;
  let changed = false;
  const next = await Promise.all(
    state.stubs.map(async (s) => {
      if (s.reminderId || s.date < dayKey()) return s;
      const reminderId = await scheduleReminder(s);
      if (!reminderId) return s;
      changed = true;
      return { ...s, reminderId };
    }),
  );
  if (changed) {
    set({ stubs: next });
    persist();
  }
}

export function setLockCard(lockCard: State['lockCard']) {
  set({ lockCard });
  persist();
}

/** Remember screenshots we've looked at (newest 300). */
export function markShotsSeen(ids: string[]) {
  if (!ids.length) return;
  const next = [...ids, ...state.seenShots.filter((id) => !ids.includes(id))].slice(0, 300);
  set({ seenShots: next });
  persist();
}

// ---------- selectors ----------

export function groupStubs(stubs: Stub[], today = dayKey()) {
  return {
    today: stubs.filter((s) => s.date === today),
    upcoming: stubs.filter((s) => s.date > today),
    past: stubs.filter((s) => s.date < today).reverse(),
  };
}
