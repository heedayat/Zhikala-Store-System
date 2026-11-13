export interface CompressedImageResult {
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
  byteLength: number;
}

const MAX_WIDTH_PX = 800;
const TARGET_MAX_BYTES = 135_000;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error(`Could not read image file "${file.name}".`));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Unsupported or corrupted image file.'));
    img.src = src;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to encode compressed JPEG.'));
          return;
        }
        resolve(blob);
      },
      'image/jpeg',
      quality
    );
  });
}

/**
 * Resizes an image file to at most 800px wide and encodes it as a compact JPEG.
 */
export async function compressProductImage(file: File): Promise<CompressedImageResult> {
  if (!file.type.startsWith('image/')) {
    throw new Error(`"${file.name}" is not an image file.`);
  }

  const rawDataUrl = await readFileAsDataUrl(file);
  const img = await loadImage(rawDataUrl);

  const scale = img.naturalWidth > MAX_WIDTH_PX ? MAX_WIDTH_PX / img.naturalWidth : 1;
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Browser canvas 2D context is unavailable.');
  }

  // Paint white backdrop so transparent PNG/WebP cutouts convert cleanly to JPEG
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  let quality = 0.82;
  let blob = await canvasToBlob(canvas, quality);

  // Step down quality gently if needed so inline fallback stays well under Firestore 1MB doc limit
  while (blob.size > TARGET_MAX_BYTES && quality > 0.45) {
    quality -= 0.1;
    blob = await canvasToBlob(canvas, quality);
  }

  const dataUrl = canvas.toDataURL('image/jpeg', quality);
  return {
    blob,
    dataUrl,
    width,
    height,
    byteLength: blob.size,
  };
}

const MAX_LOGO_DIM_PX = 256;
const MAX_LOGO_DATA_URL_LENGTH = 160_000;

/**
 * Resizes an uploaded store logo image while preserving PNG transparency
 * and guarantees the resulting data URL fits cleanly inside Firestore & localStorage.
 */
export async function compressLogoPng(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error(`"${file.name}" is not an image file.`);
  }

  const rawDataUrl = await readFileAsDataUrl(file);
  const img = await loadImage(rawDataUrl);

  const trySizes = [MAX_LOGO_DIM_PX, 192, 144, 96];
  let bestUrl = '';

  for (const maxDim of trySizes) {
    const largestSide = Math.max(img.naturalWidth, img.naturalHeight, 1);
    const scale = largestSide > maxDim ? maxDim / largestSide : 1;
    const width = Math.max(1, Math.round(img.naturalWidth * scale));
    const height = Math.max(1, Math.round(img.naturalHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Browser canvas 2D context is unavailable.');
    }
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    const pngUrl = canvas.toDataURL('image/png');
    bestUrl = pngUrl;
    if (pngUrl.length <= MAX_LOGO_DATA_URL_LENGTH) {
      return pngUrl;
    }
  }

  if (bestUrl.length > MAX_LOGO_DATA_URL_LENGTH) {
    throw new Error('Logo image is still too large after compression. Choose a simpler PNG.');
  }
  return bestUrl;
}
