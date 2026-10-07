import { File } from 'expo-file-system';
import { isScannerAvailable, scanFileAsync, type ScannedPage } from '../../modules/stubs-scanner';
import { dayKey } from './dates';
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
export async function importFiles(files: IncomingFile[]): Promise<Stub> {
  if (!files.length) throw new Error('Nothing to import.');
  const id = newId();
  try {
    return await buildDraft(id, files);
  } catch (e) {
    deleteStubFiles(id);
    throw e;
  }
}

async function buildDraft(id: string, files: IncomingFile[]): Promise<Stub> {
  const dir = stubDir(id);

  const tickets: Ticket[] = [];
  const pageUris: string[] = [];
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
      pages = [{ pageIndex: 0, imageUri: dest.uri, width: 0, height: 0, codes: [] }];
    }

    const anyCodes = pages.some((p) => p.codes.length > 0);
    for (const page of pages) {
      pageUris.push(page.imageUri);
      if (page.codes.length) {
        for (const code of page.codes) {
          tickets.push({ id: newId(), pageUri: page.imageUri, code });
        }
      } else if (!anyCodes) {
        // No code anywhere in this file: keep the pages themselves as the ticket.
        tickets.push({ id: newId(), pageUri: page.imageUri });
      }
    }
  }

  if (!tickets.length) {
    throw new Error("Couldn't read that file. Try a screenshot of the ticket instead.");
  }

  const draft: Stub = {
    id,
    title: titleFromFileName(files[0].name),
    kind: 'event',
    date: dayKey(),
    tickets,
    sourceUri,
    sourceName: files[0].name ?? 'Ticket',
    pageUris,
    createdAt: Date.now(),
  };
  setDraft(draft);
  return draft;
}
