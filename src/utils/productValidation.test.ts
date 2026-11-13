import test from 'node:test';
import assert from 'node:assert/strict';
import type { ProductFormValues } from '../types/inventory';
import { validateProductForm } from './productValidation';

const baseForm: ProductFormValues = {
  name: 'RC Monster Truck',
  barcode: '2012345678901',
  category: 'RC Vehicles',
  sellingPrice: '35000',
  costPrice: '22000',
  quantityInStock: '8',
  reorderLevel: '3',
  photos: [],
  brand: 'Speedster',
  ageRange: '6+ years',
  supplier: 'Baghdad Toys Co',
  variantLabel: 'Red 1:16',
  notes: 'Requires 4 AA batteries',
};

test('validateProductForm accepts valid payload and parses numeric fields', () => {
  const res = validateProductForm(baseForm, [], null);
  assert.equal(res.valid, true);
  if (res.valid) {
    assert.equal(res.data.name, 'RC Monster Truck');
    assert.equal(res.data.sellingPrice, 35000);
    assert.equal(res.data.costPrice, 22000);
    assert.equal(res.data.quantityInStock, 8);
    assert.equal(res.data.reorderLevel, 3);
  }
});

test('validateProductForm rejects missing required fields and negative values', () => {
  const res = validateProductForm(
    {
      ...baseForm,
      name: '   ',
      sellingPrice: '-100',
      costPrice: '',
      quantityInStock: '1.5',
      reorderLevel: '-1',
    },
    [],
    null
  );
  assert.equal(res.valid, false);
  if (!res.valid) {
    assert.ok(res.errors.name);
    assert.ok(res.errors.sellingPrice);
    assert.ok(res.errors.costPrice);
    assert.ok(res.errors.quantityInStock);
    assert.ok(res.errors.reorderLevel);
  }
});

test('validateProductForm enforces barcode uniqueness across products', () => {
  const existing = [{ id: 'p1', name: 'Other Toy', barcode: '2012345678901' }];
  const duplicateRes = validateProductForm(baseForm, existing, null);
  assert.equal(duplicateRes.valid, false);
  if (!duplicateRes.valid) {
    assert.match(duplicateRes.errors.barcode ?? '', /Other Toy/);
  }

  const sameProductEdit = validateProductForm(baseForm, existing, 'p1');
  assert.equal(sameProductEdit.valid, true);
});
