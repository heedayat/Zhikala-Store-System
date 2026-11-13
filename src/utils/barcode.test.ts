import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeEan13CheckDigit,
  encodeCode128B,
  findDuplicateBarcodeProduct,
  generateUniqueBarcode,
} from './barcode';

test('computeEan13CheckDigit calculates valid EAN-13 check digit', () => {
  // Known EAN-13 example: 400638133393 -> check digit 1
  assert.equal(computeEan13CheckDigit('400638133393'), 1);
});

test('generateUniqueBarcode produces a 13-digit numeric code with valid check digit and no collision', () => {
  const existing = ['2000000000008', '2012345678901'];
  const code = generateUniqueBarcode(existing);
  assert.match(code, /^20\d{11}$/);
  assert.equal(existing.includes(code), false);
  const expectedCheck = computeEan13CheckDigit(code.slice(0, 12));
  assert.equal(Number(code[12]), expectedCheck);
});

test('findDuplicateBarcodeProduct detects collision excluding current editing product', () => {
  const products = [
    { id: 'p1', name: 'Toy Car', barcode: '123456' },
    { id: 'p2', name: 'Doll House', barcode: '654321' },
  ];
  assert.equal(findDuplicateBarcodeProduct('123456', null, products)?.id, 'p1');
  assert.equal(findDuplicateBarcodeProduct('123456', 'p1', products), undefined);
  assert.equal(findDuplicateBarcodeProduct('123456', 'p2', products)?.id, 'p1');
  assert.equal(findDuplicateBarcodeProduct('', null, products), undefined);
});

test('encodeCode128B outputs valid bar positions within totalWidth', () => {
  const encoded = encodeCode128B('2012345678901');
  assert.ok(encoded.bars.length > 10);
  assert.ok(encoded.totalWidth > 100);
  const lastBar = encoded.bars[encoded.bars.length - 1];
  assert.ok(lastBar.x + lastBar.width < encoded.totalWidth);
});
