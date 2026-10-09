import { requireOptionalNativeModule } from 'expo';

export type ScannedCode = {
  /** qr | aztec | pdf417 | datamatrix | linear */
  symbology: string;
  /** Decoded text, when the code holds text. */
  payload?: string;
  /** PNG crop of the code with a quiet zone, straight from the ticket. */
  cropUri: string;
};

export type ScannedPage = {
  pageIndex: number;
  /** The page's text: the PDF text layer, or on-device OCR for images and scans. */
  text: string;
  imageUri: string;
  width: number;
  height: number;
  codes: ScannedCode[];
};

type NativeScanner = {
  scanFileAsync(uri: string, outDir: string): Promise<ScannedPage[]>;
  /** Newer builds only: Apple's document camera for paper tickets. */
  scanPaperAsync?(outDir: string): Promise<string[]>;
};

// Optional so the JS still loads in Expo Go; scanning needs a development build.
const native = requireOptionalNativeModule<NativeScanner>('StubsScanner');

export const isScannerAvailable = native != null;

export async function scanFileAsync(uri: string, outDir: string): Promise<ScannedPage[]> {
  if (!native) {
    throw new Error('Ticket scanning needs a development build (it does not run in Expo Go).');
  }
  return native.scanFileAsync(uri, outDir);
}

/** True on builds that include the paper-ticket camera. */
export const isPaperScanAvailable = typeof native?.scanPaperAsync === 'function';

/** Opens the document camera; resolves with the scanned page image URIs ([] if cancelled). */
export async function scanPaperAsync(outDir: string): Promise<string[]> {
  if (!native?.scanPaperAsync) throw new Error('Scanning paper tickets needs the latest Stash from TestFlight.');
  return native.scanPaperAsync(outDir);
}
