import { Directory, File, Paths } from 'expo-file-system';

/** Everything Stubs keeps lives under Documents/stubs/. */
export const rootDir = () => new Directory(Paths.document, 'stubs');

export function stubDir(id: string): Directory {
  const dir = new Directory(rootDir(), id);
  dir.create({ intermediates: true, idempotent: true });
  return dir;
}

export function deleteStubFiles(id: string) {
  const dir = new Directory(rootDir(), id);
  try {
    if (dir.exists) dir.delete();
  } catch {
    // Already gone, or locked; nothing useful to do.
  }
}

export function dbFile(): File {
  rootDir().create({ intermediates: true, idempotent: true });
  return new File(rootDir(), 'stubs.json');
}

export function newId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/** Turn "Ferry_Ticket-Nidri_Kefalonia_07Oct.pdf" into "Ferry Ticket Nidri Kefalonia 07Oct". */
export function titleFromFileName(name: string | null | undefined): string {
  if (!name) return '';
  const base = name.replace(/\.[a-z0-9]{2,5}$/i, '');
  if (/^(IMG|Screenshot|image|photo|PXL)[ _-]?\d/i.test(base) || /^[0-9a-f-]{20,}$/i.test(base)) return '';
  const words = base
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  // Drop filler like "Ticket", "Your tickets", "E-ticket" from the front.
  const cleaned = words.replace(/^((your|my|the|e|mobile|print at home)\s+)*(e ?tickets?|tickets?|booking|confirmation)\b[\s:.-]*/i, '').trim();
  // Tickets sent from Stash arrive as "Title – ticket 2"; keep just the title.
  const unsent = (cleaned || words).replace(/\s*[–-]\s*ticket\s*\d+$/i, '').trim();
  return unsent.slice(0, 60);
}

/**
 * iOS moves the app to a new folder on every update/reinstall, so a saved full path
 * like file:///…/Application/<OLD-ID>/Documents/stubs/abc/source-0.pdf goes stale.
 * Re-point anything inside our Documents/stubs folder at the current location.
 */
export function rebase(uri: string): string;
export function rebase(uri: string | undefined): string | undefined;
export function rebase(uri: string | undefined): string | undefined {
  if (!uri) return uri;
  const m = uri.match(/\/Documents\/(stubs\/.+)$/);
  if (!m) return uri;
  const base = Paths.document.uri.endsWith('/') ? Paths.document.uri : `${Paths.document.uri}/`;
  return `${base}${m[1]}`;
}
