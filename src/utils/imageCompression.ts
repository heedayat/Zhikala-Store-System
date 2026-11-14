export interface CompressedImageResult {
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
  byteLength: number;
  mimeType: string;
  qualityUsed: number;
}

export const MAX_RAW_IMAGE_BYTES = 15 * 1024 * 1024; // 15 MB

export const PRODUCT_MAX_DIMENSION_PX = 400;
export const PRODUCT_INITIAL_WEBP_QUALITY = 0.78;
export const PRODUCT_FALLBACK_JPEG_QUALITY = 0.75;

export const LOGO_MAX_DIMENSION_PX = 250;
export const LOGO_INITIAL_WEBP_QUALITY = 0.85;

export const BASE64_STEPDOWN_THRESHOLD_BYTES = 80 * 1024; // 80 KB
export const BASE64_MIN_TARGET_BYTES = 15 * 1024; // 15 KB
export const BASE64_MAX_TARGET_BYTES = 60 * 1024; // 60 KB
export const QUALITY_STEP_DOWN_LEVELS = [0.65, 0.5] as const;
const EXTRA_QUALITY_LEVELS = [0.4, 0.3] as const;
const EXTRA_SCALE_STEPS = [0.85, 0.72, 0.6] as const;

const SUPPORTED_IMAGE_EXTENSION_RE = /\.(png|jpe?g|webp|heic|heif|gif|bmp|avif|svg)$/i;

export function isSupportedImageFile(file: { name: string; type: string }): boolean {
  const mime = (file.type ?? '').trim().toLowerCase();
  if (mime.startsWith('image/')) return true;
  return SUPPORTED_IMAGE_EXTENSION_RE.test((file.name ?? '').trim());
}

export function validateRawImageFile(file: {
  name: string;
  type: string;
  size?: number;
}): void {
  if (!isSupportedImageFile(file)) {
    throw new Error(`"${file.name}" is not a supported image file (PNG, JPG, WEBP, or HEIC).`);
  }
  if (typeof file.size === 'number' && file.size > MAX_RAW_IMAGE_BYTES) {
    throw new Error(`"${file.name}" exceeds the 15 MB raw file limit.`);
  }
}

export function computeProportionalDimensions(
  naturalWidth: number,
  naturalHeight: number,
  maxDimension: number
): { width: number; height: number } {
  const safeW = Math.max(1, Math.round(naturalWidth));
  const safeH = Math.max(1, Math.round(naturalHeight));
  const maxSide = Math.max(safeW, safeH);

  // Never upscale images whose width and height are already within maxDimension
  if (maxSide <= maxDimension) {
    return { width: safeW, height: safeH };
  }

  const scale = maxDimension / maxSide;
  return {
    width: Math.max(1, Math.round(safeW * scale)),
    height: Math.max(1, Math.round(safeH * scale)),
  };
}

export function getDataUrlByteSize(dataUrl: string): number {
  return dataUrl.length;
}

export function getPreviewImageSizeBytes(src: string | null | undefined): number | null {
  if (!src) return null;
  if (src.startsWith('data:image/')) {
    return getDataUrlByteSize(src);
  }
  return null;
}

export interface AdaptiveEncodeCandidate {
  dataUrl: string;
  quality: number;
  byteLength: number;
  scale: number;
}

/**
 * Pure adaptive quality & size controller:
 * - Starts at initialQuality. If <= 80 KB, keeps it immediately.
 * - If > 80 KB, steps down quality to 0.65 then 0.50 until size is between 15 KB and 60 KB.
 * - If still > 60 KB (e.g., dense lossless/JPEG inputs), applies gentle quality/scale fallback.
 */
export function runAdaptiveSizeSelection(options: {
  initialQuality: number;
  encode: (quality: number, scale: number) => string;
}): AdaptiveEncodeCandidate {
  const { initialQuality, encode } = options;

  const firstUrl = encode(initialQuality, 1);
  const firstLen = getDataUrlByteSize(firstUrl);
  let best: AdaptiveEncodeCandidate = {
    dataUrl: firstUrl,
    quality: initialQuality,
    byteLength: firstLen,
    scale: 1,
  };

  if (firstLen <= BASE64_STEPDOWN_THRESHOLD_BYTES) {
    return best;
  }

  for (const quality of QUALITY_STEP_DOWN_LEVELS) {
    const url = encode(quality, 1);
    const byteLength = getDataUrlByteSize(url);
    const candidate: AdaptiveEncodeCandidate = { dataUrl: url, quality, byteLength, scale: 1 };

    if (byteLength >= BASE64_MIN_TARGET_BYTES && byteLength <= BASE64_MAX_TARGET_BYTES) {
      return candidate;
    }
    if (byteLength <= BASE64_MAX_TARGET_BYTES) {
      return candidate;
    }
    if (byteLength < best.byteLength) {
      best = candidate;
    }
  }

  for (const quality of EXTRA_QUALITY_LEVELS) {
    const url = encode(quality, 1);
    const byteLength = getDataUrlByteSize(url);
    const candidate: AdaptiveEncodeCandidate = { dataUrl: url, quality, byteLength, scale: 1 };

    if (byteLength >= BASE64_MIN_TARGET_BYTES && byteLength <= BASE64_MAX_TARGET_BYTES) {
      return candidate;
    }
    if (byteLength <= BASE64_MAX_TARGET_BYTES) {
      return candidate;
    }
    if (byteLength < best.byteLength) {
      best = candidate;
    }
  }

  for (const scale of EXTRA_SCALE_STEPS) {
    const url = encode(0.5, scale);
    const byteLength = getDataUrlByteSize(url);
    const candidate: AdaptiveEncodeCandidate = { dataUrl: url, quality: 0.5, byteLength, scale };

    if (byteLength >= BASE64_MIN_TARGET_BYTES && byteLength <= BASE64_MAX_TARGET_BYTES) {
      return candidate;
    }
    if (byteLength <= BASE64_MAX_TARGET_BYTES) {
      return candidate;
    }
    if (byteLength < best.byteLength) {
      best = candidate;
    }
  }

  return best;
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(
        new Error(
          `Could not decode "${file.name}". If this is a HEIC photo, convert to JPG/PNG/WEBP or open in Safari.`
        )
      );
    };
    img.src = objectUrl;
  });
}

function drawResizedCanvas(
  img: HTMLImageElement,
  width: number,
  height: number,
  fillBackgroundHex: string | null
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Browser canvas 2D context is unavailable.');
  }

  if (fillBackgroundHex) {
    ctx.fillStyle = fillBackgroundHex;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function checkWebpEncodingSupported(canvas: HTMLCanvasElement): boolean {
  try {
    return canvas.toDataURL('image/webp', 0.8).startsWith('data:image/webp');
  } catch {
    return false;
  }
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64Body = ''] = dataUrl.split(',');
  const mimeMatch = header.match(/data:([^;]+);base64/i);
  const mimeType = mimeMatch?.[1] || 'image/webp';
  const binary = atob(base64Body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

async function compressImageWithOptions(
  file: File,
  options: {
    maxDimension: number;
    webpQuality: number;
    fallbackMime: 'image/jpeg' | 'image/png';
    fallbackQuality: number;
    preserveAlphaOnFallback: boolean;
  }
): Promise<CompressedImageResult> {
  validateRawImageFile(file);
  const img = await loadImageFromFile(file);
  const baseDims = computeProportionalDimensions(
    img.naturalWidth,
    img.naturalHeight,
    options.maxDimension
  );

  // Probe WebP support on an offscreen canvas
  const probeCanvas = drawResizedCanvas(img, baseDims.width, baseDims.height, null);
  const webpSupported = checkWebpEncodingSupported(probeCanvas);
  const targetMime = webpSupported ? 'image/webp' : options.fallbackMime;
  const initialQuality = webpSupported ? options.webpQuality : options.fallbackQuality;
  const fillBg = !webpSupported && !options.preserveAlphaOnFallback ? '#ffffff' : null;

  let finalWidth = baseDims.width;
  let finalHeight = baseDims.height;

  const selected = runAdaptiveSizeSelection({
    initialQuality,
    encode: (quality, scale) => {
      const w = Math.max(1, Math.round(baseDims.width * scale));
      const h = Math.max(1, Math.round(baseDims.height * scale));
      finalWidth = w;
      finalHeight = h;
      const canvas = drawResizedCanvas(img, w, h, fillBg);
      return canvas.toDataURL(targetMime, quality);
    },
  });

  const blob = dataUrlToBlob(selected.dataUrl);
  return {
    blob,
    dataUrl: selected.dataUrl,
    width: finalWidth,
    height: finalHeight,
    byteLength: selected.byteLength,
    mimeType: targetMime,
    qualityUsed: selected.quality,
  };
}

/**
 * Resizes a product photo proportionally so max width/height is 400px (no upscaling),
 * exports WebP at 0.78 (JPEG 0.75 fallback), and steps down quality if > 80 KB.
 */
export async function compressProductImage(file: File): Promise<CompressedImageResult> {
  return compressImageWithOptions(file, {
    maxDimension: PRODUCT_MAX_DIMENSION_PX,
    webpQuality: PRODUCT_INITIAL_WEBP_QUALITY,
    fallbackMime: 'image/jpeg',
    fallbackQuality: PRODUCT_FALLBACK_JPEG_QUALITY,
    preserveAlphaOnFallback: false,
  });
}

/**
 * Resizes a store logo proportionally to at most 250px while preserving transparency,
 * exports WebP at 0.85 (PNG fallback), and steps down quality if > 80 KB.
 */
export async function compressLogoImage(file: File): Promise<CompressedImageResult> {
  return compressImageWithOptions(file, {
    maxDimension: LOGO_MAX_DIMENSION_PX,
    webpQuality: LOGO_INITIAL_WEBP_QUALITY,
    fallbackMime: 'image/png',
    fallbackQuality: 1,
    preserveAlphaOnFallback: true,
  });
}

export async function compressLogoPng(file: File): Promise<string> {
  const result = await compressLogoImage(file);
  return result.dataUrl;
}
