import { Directory, Paths } from 'expo-file-system';
import {
  Asset,
  AssetField,
  getPermissionsAsync,
  MediaSubtype,
  MediaType,
  Query,
  requestPermissionsAsync,
} from 'expo-media-library';
import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';
import { isScannerAvailable, scanFileAsync } from '../../modules/stubs-scanner';
import { getState, markShotsSeen, setSettings } from './store';

/** A recent screenshot that has a ticket code in it. */
export type FoundShot = { assetId: string; uri: string; codes: number };

const LOOK_BACK_MS = 2 * 24 * 60 * 60 * 1000;
const MAX_CHECK = 12;

let found: FoundShot[] = [];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function useFoundShots(): FoundShot[] {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => found,
  );
}

export function dismissShot(assetId: string) {
  found = found.filter((f) => f.assetId !== assetId);
  emit();
}

export const screenshotsSupported = Platform.OS === 'ios' && isScannerAvailable;

/** Ask once. Read access to photos is needed to see new screenshots. */
export async function enableScreenshotCheck(): Promise<boolean> {
  const res = await requestPermissionsAsync(false, ['photo']);
  const ok = res.granted || res.accessPrivileges === 'limited';
  setSettings({ screenshots: ok ? 'on' : 'off' });
  if (ok) checkRecentScreenshots();
  return ok;
}

let running = false;

/**
 * Looks at screenshots from the last two days that Stubs hasn't seen yet and keeps
 * the ones with a ticket code. Runs when Stubs opens; iOS doesn't let apps watch
 * the photo library in the background.
 */
export async function checkRecentScreenshots() {
  const { settings, seenShots } = getState();
  if (!screenshotsSupported || settings.screenshots !== 'on' || running) return;
  running = true;
  try {
    const perm = await getPermissionsAsync(false, ['photo']);
    if (!perm.granted && perm.accessPrivileges !== 'limited') return;

    const assets = await new Query()
      .eq(AssetField.MEDIA_TYPE, MediaType.IMAGE)
      .gte(AssetField.CREATION_TIME, Date.now() - LOOK_BACK_MS)
      .orderBy({ key: AssetField.CREATION_TIME, ascending: false })
      .limit(MAX_CHECK * 3)
      .exe();

    const fresh: Asset[] = [];
    for (const a of assets) {
      if (seenShots.includes(a.id) || found.some((f) => f.assetId === a.id)) continue;
      const subtypes = await a.getMediaSubtypes().catch(() => [] as MediaSubtype[]);
      if (subtypes.includes(MediaSubtype.SCREENSHOT)) fresh.push(a);
      if (fresh.length >= MAX_CHECK) break;
    }
    if (!fresh.length) return;

    const scratch = new Directory(Paths.cache, 'screenshot-check');
    try {
      if (scratch.exists) scratch.delete();
    } catch {}
    scratch.create({ intermediates: true, idempotent: true });

    const hits: FoundShot[] = [];
    for (const a of fresh) {
      try {
        const uri = await a.getUri();
        const pages = await scanFileAsync(uri, scratch.uri);
        const codes = pages.reduce((n, p) => n + p.codes.length, 0);
        if (codes > 0) hits.push({ assetId: a.id, uri, codes });
      } catch {
        // iCloud-only or unreadable screenshot: skip it.
      }
    }
    markShotsSeen(fresh.map((a) => a.id));
    if (hits.length) {
      found = [...hits, ...found].slice(0, 3);
      emit();
    }
  } catch (e) {
    console.warn('Screenshot check failed', e);
  } finally {
    running = false;
  }
}
