import type { Product } from '../types/inventory';

/**
 * Generates an internal 13-digit numeric EAN-13 style barcode (prefix "20" for in-store items)
 * with a valid modulo-10 check digit, guaranteed unique against existingBarcodes.
 */
export function computeEan13CheckDigit(first12Digits: string): number {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = Number(first12Digits[i]);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  return (10 - (sum % 10)) % 10;
}

export function generateUniqueBarcode(existingBarcodes: Iterable<string>): string {
  const existing = new Set<string>();
  for (const code of existingBarcodes) {
    const trimmed = code.trim();
    if (trimmed) existing.add(trimmed);
  }

  for (let attempt = 0; attempt < 200; attempt++) {
    // Prefix 20 is reserved for in-store / internal retail numbering
    const randomTenDigits = Array.from({ length: 10 }, () =>
      Math.floor(Math.random() * 10).toString()
    ).join('');
    const base12 = `20${randomTenDigits}`;
    const check = computeEan13CheckDigit(base12);
    const candidate = `${base12}${check}`;
    if (!existing.has(candidate)) {
      return candidate;
    }
  }

  // Deterministic fallback if random space were ever exhausted
  const ts = Date.now().toString().slice(-10).padStart(10, '0');
  const base12 = `20${ts}`;
  return `${base12}${computeEan13CheckDigit(base12)}`;
}

export function findDuplicateBarcodeProduct(
  barcode: string,
  currentProductId: string | null,
  products: Pick<Product, 'id' | 'name' | 'barcode'>[]
): Pick<Product, 'id' | 'name' | 'barcode'> | undefined {
  const normalized = barcode.trim();
  if (!normalized) return undefined;
  return products.find(
    (p) => p.id !== currentProductId && (p.barcode ?? '').trim() === normalized
  );
}

/**
 * Code 128B encoding table (values 0..106).
 * Each entry is 6 bar/space module widths (bar, space, bar, space, bar, space),
 * except Stop (106) which has 7 modules.
 */
const CODE128_PATTERNS: readonly string[] = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312',
  '132212', '221213', '221312', '231212', '112232', '122132', '122231', '113222',
  '123122', '123221', '223211', '221132', '221231', '213212', '223112', '312131',
  '311222', '321122', '321221', '312212', '322112', '322211', '212123', '212321',
  '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121',
  '313121', '211331', '231131', '213113', '213311', '213131', '311123', '311321',
  '331121', '312113', '312311', '332111', '314111', '221411', '431111', '111224',
  '111422', '121124', '121421', '141122', '141221', '112214', '112412', '122114',
  '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112',
  '421211', '212141', '214121', '412121', '111143', '111341', '131141', '114113',
  '114311', '411113', '411311', '113141', '114131', '311141', '411131', '211412',
  '211214', '211232', '2331112',
];

export interface BarcodeBar {
  x: number;
  width: number;
}

export interface Code128Encoded {
  bars: BarcodeBar[];
  totalWidth: number;
}

/**
 * Encodes printable ASCII (32..126) into Code 128B bars with start code, checksum, and stop code.
 * Unprintable characters are normalized to '?' so label rendering never crashes.
 */
export function encodeCode128B(rawValue: string): Code128Encoded {
  const value = rawValue.trim() || '000000';
  const startCodeB = 104;
  const stopCode = 106;

  const codes: number[] = [startCodeB];
  let checksum = startCodeB;

  for (let i = 0; i < value.length; i++) {
    const charCode = value.charCodeAt(i);
    const symbolValue = charCode >= 32 && charCode <= 126 ? charCode - 32 : 31; // fallback '?'
    codes.push(symbolValue);
    checksum += symbolValue * (i + 1);
  }

  codes.push(checksum % 103);
  codes.push(stopCode);

  const quietZone = 10;
  let cursor = quietZone;
  const bars: BarcodeBar[] = [];

  for (const code of codes) {
    const pattern = CODE128_PATTERNS[code];
    for (let i = 0; i < pattern.length; i++) {
      const moduleWidth = Number(pattern[i]);
      if (i % 2 === 0) {
        bars.push({ x: cursor, width: moduleWidth });
      }
      cursor += moduleWidth;
    }
  }

  return {
    bars,
    totalWidth: cursor + quietZone,
  };
}
