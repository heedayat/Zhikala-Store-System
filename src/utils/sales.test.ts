import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Product, Sale } from '../types/inventory';
import {
  addProductToCart,
  buildSaleLineItems,
  computeCartSummary,
  computeDailyReconciliation,
  filterSales,
  formatLocalYmd,
  getPaymentMethodLabel,
  isDigitalPaymentMethod,
  isLineBelowCost,
  isLineExceedingStock,
  normalizePaymentMethod,
  removeCartItem,
  stepCartItemQuantity,
  updateCartItemQuantity,
  updateCartItemUnitPrice,
} from './sales.ts';

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'prod-1',
    ownerId: 'owner-1',
    name: 'Wooden Express Train',
    barcode: '2048192038471',
    category: 'Wooden Toys',
    sellingPrice: 28000,
    costPrice: 17500,
    quantityInStock: 3,
    reorderLevel: 5,
    photos: [],
    isArchived: false,
    ...overrides,
  };
}

describe('cart operations', () => {
  it('adds a product and increments quantity on repeat scans without resetting bargained price', () => {
    const train = makeProduct();
    let cart = addProductToCart([], train);
    assert.equal(cart.length, 1);
    assert.equal(cart[0].quantity, 1);
    assert.equal(cart[0].unitPrice, 28000);

    cart = updateCartItemUnitPrice(cart, train.id, 25000);
    cart = addProductToCart(cart, train);

    assert.equal(cart.length, 1);
    assert.equal(cart[0].quantity, 2);
    assert.equal(cart[0].unitPrice, 25000);
    assert.equal(cart[0].listPrice, 28000);
  });

  it('supports stepping, direct quantity update, and removal', () => {
    const train = makeProduct();
    const bricks = makeProduct({
      id: 'prod-2',
      name: 'Bricks Tub',
      sellingPrice: 35000,
      costPrice: 22000,
      quantityInStock: 10,
    });

    let cart = addProductToCart([], train);
    cart = addProductToCart(cart, bricks);
    cart = updateCartItemQuantity(cart, train.id, 4);
    assert.equal(cart[0].quantity, 4);

    // Stepping bricks down from 1 to 0 removes it
    cart = stepCartItemQuantity(cart, bricks.id, -1);
    assert.equal(cart.length, 1);

    // Direct invalid quantity is ignored
    cart = updateCartItemQuantity(cart, train.id, 0);
    assert.equal(cart[0].quantity, 4);

    cart = removeCartItem(cart, train.id);
    assert.equal(cart.length, 0);
  });
});

describe('warnings & sale snapshots', () => {
  it('flags below-cost pricing and exceeding-stock quantities without blocking', () => {
    const train = makeProduct({ sellingPrice: 28000, costPrice: 17500, quantityInStock: 2 });
    let cart = addProductToCart([], train);
    cart = updateCartItemUnitPrice(cart, train.id, 15000);
    cart = updateCartItemQuantity(cart, train.id, 4);

    assert.equal(isLineBelowCost(cart[0], train), true);
    assert.equal(isLineExceedingStock(cart[0], train), true);

    const summary = computeCartSummary(cart, [train]);
    assert.equal(summary.totalAmount, 60000);
    assert.equal(summary.totalCost, 70000);
    assert.equal(summary.itemCount, 4);
    assert.equal(summary.belowCostCount, 1);
    assert.equal(summary.exceedingStockCount, 1);

    const snapshot = buildSaleLineItems(cart, [train]);
    assert.equal(snapshot[0].listPrice, 28000);
    assert.equal(snapshot[0].unitPrice, 15000);
    assert.equal(snapshot[0].costPrice, 17500);
    assert.equal(snapshot[0].lineTotal, 60000);
  });
});

describe('reconciliation & history filtering', () => {
  it('calculates today total, count, and noted sales excluding voided or older sales', () => {
    const ref = new Date(2026, 10, 13, 18, 0, 0);
    const sales: Sale[] = [
      {
        id: 's1',
        ownerId: 'o1',
        items: [],
        totalAmount: 50000,
        totalCost: 30000,
        itemCount: 2,
        paymentMethod: 'fib',
        note: 'Paid via FIB',
        status: 'completed',
        createdAt: new Date(2026, 10, 13, 14, 15, 0),
      },
      {
        id: 's2',
        ownerId: 'o1',
        items: [],
        totalAmount: 20000,
        totalCost: 12000,
        itemCount: 1,
        paymentMethod: 'cash',
        note: '',
        status: 'completed',
        createdAt: new Date(2026, 10, 13, 10, 0, 0),
      },
      {
        id: 's3',
        ownerId: 'o1',
        items: [],
        totalAmount: 99000,
        totalCost: 50000,
        itemCount: 3,
        paymentMethod: 'card',
        note: 'Voided FIB',
        status: 'voided',
        createdAt: new Date(2026, 10, 13, 16, 0, 0),
      },
      {
        id: 's4',
        ownerId: 'o1',
        items: [],
        totalAmount: 40000,
        totalCost: 24000,
        itemCount: 2,
        paymentMethod: 'cash',
        note: 'Yesterday note',
        status: 'completed',
        createdAt: new Date(2026, 10, 12, 16, 0, 0),
      },
    ];

    const recon = computeDailyReconciliation(sales, ref);
    assert.equal(recon.todayTotal, 70000);
    assert.equal(recon.todayCashTotal, 20000);
    assert.equal(recon.todayDigitalTotal, 50000);
    assert.equal(recon.todayCashCount, 1);
    assert.equal(recon.todayDigitalCount, 1);
    assert.equal(recon.todaySalesCount, 2);
    assert.equal(recon.todayVoidedCount, 1);
    assert.deepEqual(
      recon.notedSalesToday.map((s) => s.id),
      ['s1']
    );

    const todayFiltered = filterSales(sales, { dateYmd: formatLocalYmd(ref) });
    assert.deepEqual(
      todayFiltered.map((s) => s.id),
      ['s3', 's1', 's2']
    );

    assert.equal(getPaymentMethodLabel('cash'), 'Cash');
    assert.equal(getPaymentMethodLabel('fib'), 'FIB');
    assert.equal(getPaymentMethodLabel('card'), 'FastPay / Card');
    assert.equal(normalizePaymentMethod('unknown'), 'cash');
    assert.equal(isDigitalPaymentMethod('cash'), false);
    assert.equal(isDigitalPaymentMethod('fib'), true);
    assert.equal(isDigitalPaymentMethod('card'), true);
  });
});
