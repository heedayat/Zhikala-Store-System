import test from 'node:test';
import assert from 'node:assert/strict';
import type { Product } from '../types/inventory';
import {
  computeInventorySummary,
  extractUsedCategories,
  filterProducts,
  findProductByBarcode,
  formatActionError,
  formatCurrency,
  isLowStock,
} from './formatters';

const sampleProducts: Product[] = [
  {
    id: 'p1',
    ownerId: 'owner-1',
    name: 'Wooden Train Set',
    barcode: '2012345678901',
    category: 'Wooden Toys',
    sellingPrice: 25000,
    costPrice: 15000,
    quantityInStock: 3,
    reorderLevel: 5,
    photos: [],
    brand: 'Brio',
    variantLabel: 'Deluxe 40pc',
    isArchived: false,
  },
  {
    id: 'p2',
    ownerId: 'owner-1',
    name: 'Building Blocks Tub',
    barcode: '2098765432104',
    category: 'Blocks',
    sellingPrice: 18500,
    costPrice: 11000,
    quantityInStock: 14,
    reorderLevel: 4,
    photos: [],
    isArchived: false,
  },
  {
    id: 'p3',
    ownerId: 'owner-1',
    name: 'Discontinued Plush Bear',
    barcode: '2011111111117',
    category: 'Plush',
    sellingPrice: 12000,
    costPrice: 6000,
    quantityInStock: 2,
    reorderLevel: 5,
    photos: [],
    isArchived: true,
  },
];

test('formatCurrency formats whole numbers with thousands separators and currency code', () => {
  assert.equal(formatCurrency(25000, 'IQD'), '25,000 IQD');
  assert.equal(formatCurrency(1250000, 'IQD'), '1,250,000 IQD');
  assert.equal(formatCurrency(0, 'IQD'), '0 IQD');
  assert.equal(formatCurrency(1499.6, 'IQD'), '1,500 IQD');
});

test('isLowStock flags items at or below reorderLevel only when reorderLevel is set', () => {
  assert.equal(isLowStock({ quantityInStock: 3, reorderLevel: 5 }), true);
  assert.equal(isLowStock({ quantityInStock: 5, reorderLevel: 5 }), true);
  assert.equal(isLowStock({ quantityInStock: 6, reorderLevel: 5 }), false);
  assert.equal(isLowStock({ quantityInStock: 0, reorderLevel: null }), false);
  assert.equal(isLowStock({ quantityInStock: 0, reorderLevel: undefined }), false);
});

test('extractUsedCategories returns sorted unique non-empty categories', () => {
  const categories = extractUsedCategories([
    ...sampleProducts,
    { category: 'wooden toys' },
    { category: '   ' },
  ]);
  assert.deepEqual(categories, ['Blocks', 'Plush', 'Wooden Toys']);
});

test('findProductByBarcode matches exact trimmed barcode across products', () => {
  assert.equal(findProductByBarcode(sampleProducts, ' 2012345678901 ')?.id, 'p1');
  assert.equal(findProductByBarcode(sampleProducts, '2011111111117')?.id, 'p3');
  assert.equal(findProductByBarcode(sampleProducts, '9999999999999'), undefined);
  assert.equal(findProductByBarcode(sampleProducts, '   '), undefined);
});

test('filterProducts filters by archive status, category, lowStockOnly, and search', () => {
  assert.deepEqual(
    filterProducts(sampleProducts, {
      search: '',
      category: '',
      lowStockOnly: false,
      showArchived: false,
    }).map((p) => p.id),
    ['p1', 'p2']
  );

  assert.deepEqual(
    filterProducts(sampleProducts, {
      search: '',
      category: '',
      lowStockOnly: true,
      showArchived: false,
    }).map((p) => p.id),
    ['p1']
  );

  assert.deepEqual(
    filterProducts(sampleProducts, {
      search: 'blocks',
      category: 'Blocks',
      lowStockOnly: false,
      showArchived: false,
    }).map((p) => p.id),
    ['p2']
  );

  assert.deepEqual(
    filterProducts(sampleProducts, {
      search: '',
      category: '',
      lowStockOnly: false,
      showArchived: true,
    }).map((p) => p.id),
    ['p3']
  );
});

test('computeInventorySummary counts active, low-stock, and total retail value', () => {
  const summary = computeInventorySummary(sampleProducts);
  assert.equal(summary.activeCount, 2);
  assert.equal(summary.archivedCount, 1);
  assert.equal(summary.lowStockCount, 1);
  assert.equal(summary.totalUnits, 17);
  assert.equal(summary.totalRetailValue, 25000 * 3 + 18500 * 14);
});

test('formatActionError converts Firestore JSON errors into readable messages', () => {
  const jsonErr = new Error(
    JSON.stringify({
      error: 'Missing or insufficient permissions.',
      operationType: 'create',
      path: 'products/abc',
    })
  );
  assert.match(formatActionError(jsonErr, 'Fallback'), /permission/i);
  assert.doesNotMatch(formatActionError(jsonErr, 'Fallback'), /operationType/);

  const offlineErr = new Error('Failed to get document because the client is offline.');
  assert.match(formatActionError(offlineErr, 'Fallback'), /internet connection/i);

  assert.equal(formatActionError(new Error('Barcode already exists'), 'Fallback'), 'Barcode already exists');
  assert.match(formatActionError(new Error('Firebase: Error (auth/popup-blocked).'), 'Fallback'), /popup was blocked/i);
  assert.match(formatActionError(new Error('Firebase: Error (auth/unauthorized-domain).'), 'Fallback'), /Authorized domains/i);
  assert.equal(formatActionError(null, 'Something went wrong'), 'Something went wrong');
});
