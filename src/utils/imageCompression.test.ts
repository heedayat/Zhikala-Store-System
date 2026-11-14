import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BASE64_MAX_TARGET_BYTES,
  BASE64_MIN_TARGET_BYTES,
  BASE64_STEPDOWN_THRESHOLD_BYTES,
  LOGO_MAX_DIMENSION_PX,
  MAX_RAW_IMAGE_BYTES,
  PRODUCT_MAX_DIMENSION_PX,
  computeProportionalDimensions,
  getPreviewImageSizeBytes,
  isSupportedImageFile,
  runAdaptiveSizeSelection,
  validateRawImageFile,
} from './imageCompression';
import { formatOptimizedSizeBadge } from './i18n';

test('isSupportedImageFile & validateRawImageFile accept PNG, JPG, WEBP, and HEIC up to 15 MB', () => {
  assert.equal(isSupportedImageFile({ name: 'photo.jpg', type: 'image/jpeg' }), true);
  assert.equal(isSupportedImageFile({ name: 'logo.png', type: 'image/png' }), true);
  assert.equal(isSupportedImageFile({ name: 'banner.webp', type: 'image/webp' }), true);
  assert.equal(isSupportedImageFile({ name: 'IMG_1234.HEIC', type: '' }), true);
  assert.equal(isSupportedImageFile({ name: 'IMG_1234.heif', type: 'image/heif' }), true);
  assert.equal(isSupportedImageFile({ name: 'invoice.pdf', type: 'application/pdf' }), false);

  assert.doesNotThrow(() =>
    validateRawImageFile({
      name: 'phone-camera.heic',
      type: '',
      size: 14 * 1024 * 1024,
    })
  );

  assert.throws(
    () =>
      validateRawImageFile({
        name: 'huge.jpg',
        type: 'image/jpeg',
        size: MAX_RAW_IMAGE_BYTES + 1,
      }),
    /15 MB/
  );

  assert.throws(
    () =>
      validateRawImageFile({
        name: 'document.pdf',
        type: 'application/pdf',
        size: 1024,
      }),
    /not a supported image file/
  );
});

test('computeProportionalDimensions scales proportionally and never upscales smaller images', () => {
  assert.deepEqual(
    computeProportionalDimensions(1600, 800, PRODUCT_MAX_DIMENSION_PX),
    { width: 400, height: 200 }
  );

  assert.deepEqual(
    computeProportionalDimensions(1200, 4000, PRODUCT_MAX_DIMENSION_PX),
    { width: 120, height: 400 }
  );

  assert.deepEqual(
    computeProportionalDimensions(1000, 500, LOGO_MAX_DIMENSION_PX),
    { width: 250, height: 125 }
  );

  assert.deepEqual(
    computeProportionalDimensions(180, 120, PRODUCT_MAX_DIMENSION_PX),
    { width: 180, height: 120 }
  );

  assert.deepEqual(
    computeProportionalDimensions(200, 200, LOGO_MAX_DIMENSION_PX),
    { width: 200, height: 200 }
  );
});

test('runAdaptiveSizeSelection keeps initial result when <= 80 KB', () => {
  const calls: { quality: number; scale: number }[] = [];
  const selected = runAdaptiveSizeSelection({
    initialQuality: 0.78,
    encode: (quality, scale) => {
      calls.push({ quality, scale });
      return `data:image/webp;base64,${'A'.repeat(32 * 1024)}`;
    },
  });

  assert.equal(calls.length, 1);
  assert.equal(selected.quality, 0.78);
  assert.equal(selected.scale, 1);
  assert.ok(selected.byteLength <= BASE64_STEPDOWN_THRESHOLD_BYTES);
});

test('runAdaptiveSizeSelection steps down 0.65 -> 0.50 when initial Base64 exceeds 80 KB', () => {
  const qualitiesTried: number[] = [];
  const selected = runAdaptiveSizeSelection({
    initialQuality: 0.78,
    encode: (quality) => {
      qualitiesTried.push(quality);
      if (quality >= 0.7) {
        return `data:image/webp;base64,${'A'.repeat(95 * 1024)}`;
      }
      if (quality === 0.65) {
        return `data:image/webp;base64,${'A'.repeat(68 * 1024)}`;
      }
      return `data:image/webp;base64,${'A'.repeat(42 * 1024)}`;
    },
  });

  assert.deepEqual(qualitiesTried, [0.78, 0.65, 0.5]);
  assert.equal(selected.quality, 0.5);
  assert.ok(selected.byteLength >= BASE64_MIN_TARGET_BYTES);
  assert.ok(selected.byteLength <= BASE64_MAX_TARGET_BYTES);
});

test('runAdaptiveSizeSelection falls back to scale reduction if ultra-dense image stays above 60 KB', () => {
  const attempts: string[] = [];
  const selected = runAdaptiveSizeSelection({
    initialQuality: 0.85,
    encode: (quality, scale) => {
      attempts.push(`${quality}@${scale}`);
      const sizeKb = scale < 0.8 ? 44 : 84;
      return `data:image/webp;base64,${'A'.repeat(sizeKb * 1024)}`;
    },
  });

  assert.ok(selected.scale < 1);
  assert.ok(selected.byteLength >= BASE64_MIN_TARGET_BYTES);
  assert.ok(selected.byteLength <= BASE64_MAX_TARGET_BYTES);
  assert.ok(attempts.includes('0.65@1'));
  assert.ok(attempts.includes('0.5@1'));
});

test('getPreviewImageSizeBytes & formatOptimizedSizeBadge format EN and Kurdish badges', () => {
  const sampleDataUrl = `data:image/webp;base64,${'B'.repeat(28 * 1024)}`;
  const size = getPreviewImageSizeBytes(sampleDataUrl);
  assert.ok(size !== null && size > 28 * 1024);
  assert.equal(getPreviewImageSizeBytes('https://example.com/logo.png'), null);
  assert.equal(getPreviewImageSizeBytes(''), null);

  assert.equal(formatOptimizedSizeBadge(28 * 1024, 'en'), 'Optimized: 28 KB');
  assert.equal(formatOptimizedSizeBadge(28 * 1024, 'ku'), 'قەبارەی وێنە: ٢٨ کیلۆبایت');
});
