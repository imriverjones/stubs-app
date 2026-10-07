import { Directory, File, Paths } from 'expo-file-system';
import { isScannerAvailable, scanFileAsync, type ScannedPage } from '../../modules/stubs-scanner';
import { dayKey } from './dates';
import { extractDetails, type PageText } from './extract';
import { deleteStubFiles, newId, stubDir, titleFromFileName } from './files';
import { setDraft } from './store';
import type { Stub, Ticket } from './types';

export type IncomingFile = {
  uri: string;
  name?: string | null;
  mimeType?: string | null;
};

function extensionFor(file: IncomingFile): string {
  const fromName = file.name?.match(/\.([a-z0-9]{2,5})$/i)?.[1];
  if (fromName) return fromName.toLowerCase();
  const mime = file.mimeType ?? '';
  if (mime.includes('pdf')) return 'pdf';
  if (mime.includes('png')) return 'png';
  if (mime.includes('heic')) return 'heic';
  return 'jpg';
}

/**
 * Copies the incoming files into the app, finds every code on every page,
 * and leaves a draft stub for the confirm screen.
 * Several images (e.g. a screenshot per passenger) become one stub with several tickets.
 */
export type ImportOptions = {
  /** Fail instead of keeping the page when no code is found (e.g. a web capture). */
  requireCode?: boolean;
};

export async function importFiles(files: IncomingFile[], options: ImportOptions = {}): Promise<Stub> {
  if (!files.length) throw new Error('Nothing to import.');
  const id = newId();
  try {
    return await buildDraft(id, files, options);
  } catch (e) {
    deleteStubFiles(id);
    throw e;
  }
}

async function buildDraft(id: string, files: IncomingFile[], options: ImportOptions): Promise<Stub> {
  const dir = stubDir(id);

  const tickets: Ticket[] = [];
  const pageUris: string[] = [];
  const pageTexts: PageText[] = [];
  let sourceUri = '';

  for (const [i, incoming] of files.entries()) {
    const src = new File(incoming.uri);
    const dest = new File(dir, `source-${i}.${extensionFor(incoming)}`);
    await src.copy(dest);
    if (!sourceUri) sourceUri = dest.uri;

    let pages: ScannedPage[] = [];
    if (isScannerAvailable) {
      pages = await scanFileAsync(dest.uri, dir.uri);
    } else if (!/pdf/i.test(dest.extension)) {
      // Expo Go fallback: keep the image, no code detection.
      pages = [{ pageIndex: 0, imageUri: dest.uri, width: 0, height: 0, codes: [], text: '' }];
    }

    const anyCodes = pages.some((p) => p.codes.length > 0);
    for (const page of pages) {
      pageUris.push(page.imageUri);
      const before = tickets.length;
      if (page.codes.length) {
        for (const code of page.codes) {
          tickets.push({ id: newId(), pageUri: page.imageUri, code });
        }
      } else if (!anyCodes) {
        // No code anywhere in this file: keep the pages themselves as the ticket.
        tickets.push({ id: newId(), pageUri: page.imageUri });
      }
      pageTexts.push({
        text: page.text ?? '',
        codes: tickets.length - before,
        payloads: tickets.slice(before).map((t) => t.code?.payload),
      });
    }
  }

  if (options.requireCode && isScannerAvailable && !tickets.some((t) => t.code)) {
    throw new Error('No ticket code on screen. Scroll until the QR code or barcode is fully visible, then capture again.');
  }

  if (!tickets.length) {
    throw new Error("Couldn't read that file. Try a screenshot of the ticket instead.");
  }

  // Read date, time, seats, gates and refs off the ticket text.
  const found = extractDetails(pageTexts, tickets.length);
  tickets.forEach((t, i) => {
    if (found.perTicket[i]?.length) t.details = found.perTicket[i];
  });
  const fileTitle = titleFromFileName(files[0].name);
  const autofill: Stub['autofill'] = [];
  if (found.date) autofill.push('date');
  if (found.time) autofill.push('time');
  if (found.kind) autofill.push('kind');
  if (found.title && !fileTitle) autofill.push('title');

  const draft: Stub = {
    id,
    title: fileTitle || found.title || '',
    kind: found.kind ?? 'event',
    date: found.date ?? dayKey(),
    time: found.time,
    details: found.shared.length ? found.shared : undefined,
    autofill,
    tickets,
    sourceUri,
    sourceName: files[0].name ?? 'Ticket',
    pageUris,
    createdAt: Date.now(),
  };
  setDraft(draft);
  return draft;
}

/**
 * Reads an already-saved ticket again (e.g. one saved before Stash could read details)
 * and returns what it found. Uses the stored page images, so it works offline.
 */
export async function rereadStub(stub: Stub) {
  if (!isScannerAvailable) throw new Error('Reading tickets needs the full app, not Expo Go.');
  const scratch = new Directory(Paths.cache, `reread-${stub.id}`);
  try {
    if (scratch.exists) scratch.delete();
  } catch {}
  scratch.create({ intermediates: true, idempotent: true });

  // Tickets in order, grouped by the page they came from.
  const order: string[] = [];
  const byPage = new Map<string, Ticket[]>();
  for (const t of stub.tickets) {
    if (!byPage.has(t.pageUri)) {
      byPage.set(t.pageUri, []);
      order.push(t.pageUri);
    }
    byPage.get(t.pageUri)!.push(t);
  }

  const pages: PageText[] = [];
  for (const uri of order) {
    const tickets = byPage.get(uri)!;
    let text = '';
    try {
      const scanned = await scanFileAsync(uri, scratch.uri);
      text = scanned.map((p) => p.text ?? '').join('\n');
    } catch {
      // Page image missing: carry on with the barcode contents we have.
    }
    pages.push({ text, codes: tickets.length, payloads: tickets.map((t) => t.code?.payload) });
  }
  try {
    scratch.delete();
  } catch {}
  return extractDetails(pages, stub.tickets.length);
}
