import { Share } from 'react-native';
import { dataFromUrl, decodeLink, encodeLink, LINK_PAGE } from './stashLink';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { Stub } from './types';

const safeName = (s: string) => s.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60) || 'Ticket';

/** Copy to a nicely named file so the recipient sees "Nidri → Kefalonia – ticket 2.jpg", not "page-1F3A….jpg". */
async function staged(src: string, name: string): Promise<File> {
  const dir = new Directory(Paths.cache, 'send');
  dir.create({ intermediates: true, idempotent: true });
  const dest = new File(dir, name);
  try {
    if (dest.exists) dest.delete();
  } catch {}
  await new File(src).copy(dest);
  return dest;
}

function typeFor(uri: string) {
  const ext = uri.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', ext: 'pdf' };
  if (ext === 'png') return { mimeType: 'image/png', UTI: 'public.png', ext: 'png' };
  return { mimeType: 'image/jpeg', UTI: 'public.jpeg', ext: 'jpg' };
}

async function share(src: string, baseName: string, dialogTitle: string) {
  if (!(await Sharing.isAvailableAsync())) throw new Error("Sharing isn't available on this device.");
  const t = typeFor(src);
  const file = await staged(src, `${safeName(baseName)}.${t.ext}`);
  await Sharing.shareAsync(file.uri, { mimeType: t.mimeType, UTI: t.UTI, dialogTitle });
}

/**
 * One passenger's ticket, as an image anyone can scan. If several tickets share a page,
 * send just that ticket's code so nobody gets someone else's.
 */
export async function sendTicket(stub: Stub, index: number) {
  const t = stub.tickets[index];
  if (!t) return;
  // Came from an Add to Stash link: send a link for just this ticket (no file to share).
  if (!t.pageUri && stub.link) {
    const data = dataFromUrl(stub.link);
    const all = data ? decodeLink(data) : null;
    const one = all ? { ...all, x: [all.x[index] ?? all.x[0]] } : null;
    const url = one ? `${LINK_PAGE}#${encodeLink(one)}` : stub.link;
    await Share.share({ message: `${stub.title}${stub.tickets.length > 1 ? ` – ticket ${index + 1}` : ''}: ${url}`, url });
    return;
  }
  const sharedPage = stub.tickets.filter((x) => x.pageUri === t.pageUri).length > 1;
  const src = sharedPage && t.code?.cropUri ? t.code.cropUri : t.pageUri;
  const n = stub.tickets.length;
  await share(src, n > 1 ? `${stub.title} – ticket ${index + 1}` : stub.title, 'Send ticket');
}

/** The original file with every ticket in it (when it arrived as one PDF or image). */
export async function sendAll(stub: Stub) {
  await share(stub.sourceUri, stub.title, 'Send all tickets');
}

/** "Send all" only makes sense when every ticket came from the single original file. */
export const canSendAll = (stub: Stub) =>
  stub.tickets.length > 1 && /\.pdf$/i.test(stub.sourceUri);
