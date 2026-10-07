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
  imageUri: string;
  width: number;
  height: number;
  codes: ScannedCode[];
};

type NativeScanner = {
  scanFileAsync(uri: string, outDir: string): Promise<ScannedPage[]>;
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
