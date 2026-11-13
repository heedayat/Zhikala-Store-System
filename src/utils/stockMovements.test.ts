import test from 'node:test';
import assert from 'node:assert/strict';
import type { StockMovement } from '../types/inventory';
import {
  filterStockMovements,
  validateStockAdjustment,
} from './stockMovements';

const trainProduct = {
  id: 'p1',
  name: 'Wooden Express Train Set',
  quantityInStock: 3,
};

test('validateStockAdjustment validates add stock with optional cost price and note', () => {
  const res = validateStockAdjustment({
    type: 'add',
    product: trainProduct,
    quantity: '10',
    costPrice: '18000',
    reason: 'New stock arrived',
    note: 'Shipment #14',
  });

  assert.equal(res.valid, true);
  if (res.valid) {
    assert.equal(res.data.quantityChange, 10);
    assert.equal(res.data.nextQuantityInStock, 13);
    assert.equal(res.data.costPrice, 18000);
    assert.equal(res.data.reason, 'New stock arrived');
    assert.equal(res.data.note, 'Shipment #14');
  }
});

test('validateStockAdjustment allows add stock without cost price', () => {
  const res = validateStockAdjustment({
    type: 'add',
    product: trainProduct,
    quantity: '2',
    costPrice: '',
    reason: 'Customer return',
    note: '',
  });

  assert.equal(res.valid, true);
  if (res.valid) {
    assert.equal(res.data.costPrice, null);
    assert.equal(res.data.nextQuantityInStock, 5);
  }
});

test('validateStockAdjustment rejects removing more than current stock', () => {
  const res = validateStockAdjustment({
    type: 'remove',
    product: trainProduct,
    quantity: '4',
    costPrice: '',
    reason: 'Damaged',
    note: 'Broken box',
  });

  assert.equal(res.valid, false);
  if (!res.valid) {
    assert.match(res.errors.quantity ?? '', /only 3 in stock/i);
  }
});

test('validateStockAdjustment accepts removing up to current stock and computes negative delta', () => {
  const res = validateStockAdjustment({
    type: 'remove',
    product: trainProduct,
    quantity: '3',
    costPrice: '',
    reason: 'Lost',
    note: '',
  });

  assert.equal(res.valid, true);
  if (res.valid) {
    assert.equal(res.data.quantityChange, -3);
    assert.equal(res.data.nextQuantityInStock, 0);
    assert.equal(res.data.costPrice, null);
  }
});

test('validateStockAdjustment rejects missing product, non-integer qty, and invalid reason', () => {
  const res = validateStockAdjustment({
    type: 'remove',
    product: null,
    quantity: '1.5',
    costPrice: '',
    reason: 'New stock arrived', // invalid for remove
    note: '',
  });

  assert.equal(res.valid, false);
  if (!res.valid) {
    assert.ok(res.errors.product);
    assert.ok(res.errors.quantity);
    assert.ok(res.errors.reason);
  }
});

test('filterStockMovements sorts newest first and filters by product, type, and date range', () => {
  const movements: StockMovement[] = [
    {
      id: 'm1',
      ownerId: 'owner-1',
      productId: 'p1',
      productName: 'Wooden Express Train Set',
      type: 'add',
      quantityChange: 5,
      reason: 'New stock arrived',
      costPrice: 17500,
      createdAt: new Date(2026, 10, 10, 9, 30),
    },
    {
      id: 'm2',
      ownerId: 'owner-1',
      productId: 'p2',
      productName: 'Building Blocks',
      type: 'remove',
      quantityChange: -2,
      reason: 'Damaged',
      note: 'Torn box',
      createdAt: new Date(2026, 10, 12, 14, 15),
    },
    {
      id: 'm3',
      ownerId: 'owner-1',
      productId: 'p1',
      productName: 'Wooden Express Train Set',
      type: 'remove',
      quantityChange: -1,
      reason: 'Lost',
      createdAt: new Date(2026, 10, 13, 11, 0),
    },
  ];

  // Unfiltered -> newest first (m3, m2, m1)
  assert.deepEqual(
    filterStockMovements(movements, {
      productId: '',
      type: 'all',
      dateFrom: '',
      dateTo: '',
    }).map((m) => m.id),
    ['m3', 'm2', 'm1']
  );

  // Filter by product p1 and type remove
  assert.deepEqual(
    filterStockMovements(movements, {
      productId: 'p1',
      type: 'remove',
      dateFrom: '',
      dateTo: '',
    }).map((m) => m.id),
    ['m3']
  );

  // Filter by date range inclusive
  assert.deepEqual(
    filterStockMovements(movements, {
      productId: '',
      type: 'all',
      dateFrom: '2026-11-11',
      dateTo: '2026-11-12',
    }).map((m) => m.id),
    ['m2']
  );
});
