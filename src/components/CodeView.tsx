import { Image } from 'expo-image';
import { create } from 'qrcode';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../theme';
import type { Ticket } from '../lib/types';

/** Build one SVG path for every dark module, so the code stays razor sharp at any size. */
function qrPath(payload: string): { d: string; size: number } | null {
  try {
    const qr = create(payload, { errorCorrectionLevel: 'M' });
    const n = qr.modules.size;
    let d = '';
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        if (qr.modules.get(y, x)) d += `M${x} ${y}h1v1h-1z`;
      }
    }
    return { d, size: n };
  } catch {
    return null;
  }
}

type Props = { ticket: Ticket; size: number };

/**
 * QR codes with readable text are redrawn crisply. Everything else (Aztec, PDF417,
 * barcodes, binary QR) is shown as the exact crop from the original ticket.
 */
export function CodeView({ ticket, size }: Props) {
  const { code } = ticket;
  const redraw = useMemo(
    () => (code?.symbology === 'qr' && code.payload ? qrPath(code.payload) : null),
    [code],
  );

  if (redraw) {
    return (
      <View style={[styles.quiet, { padding: size * 0.06 }]}>
        <Svg width={size} height={size} viewBox={`0 0 ${redraw.size} ${redraw.size}`}>
          <Path d={redraw.d} fill={colors.ink} />
        </Svg>
      </View>
    );
  }

  // Barcode only (no QR): show the whole ticket, barcode and all, as it was printed.
  const whole = !code || (code.symbology === 'linear' && !!ticket.pageUri);
  const uri = whole ? ticket.pageUri : code.cropUri || ticket.pageUri;
  const wide = !whole && code?.symbology === 'pdf417';
  return (
    <View style={styles.quiet}>
      <Image
        source={{ uri }}
        style={{ width: size, height: wide ? size * 0.55 : whole ? size * 1.4 : size }}
        contentFit="contain"
        transition={0}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  quiet: { backgroundColor: colors.paper, borderRadius: 10, padding: 10 },
});
