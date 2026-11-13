import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Product, Sale } from '../types/inventory';
import {
  buildPeriodReport,
  buildReportCsv,
  computePercentChange,
  escapeCsvCell,
  getReportPeriodBounds,
} from './reports.ts';

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'p1',
    ownerId: 'o1',
    name: 'Wooden Train',
    barcode: '2048192038471',
    category: 'Wooden Toys',
    sellingPrice: 28000,
    costPrice: 18000,
    quantityInStock: 5,
    reorderLevel: 3,
    photos: [],
    isArchived: false,
    ...overrides,
  };
}

function makeSale(overrides: Partial<Sale> = {}): Sale {
  return {
    id: 's1',
    ownerId: 'o1',
    items: [
      {
        productId: 'p1',
        productName: 'Wooden Train',
        barcode: '2048192038471',
        quantity: 2,
        listPrice: 28000,
        unitPrice: 25000,
        costPrice: 18000,
        lineTotal: 50000,
      },
    ],
    totalAmount: 50000,
    totalCost: 36000,
    itemCount: 2,
    paymentMethod: 'cash',
    note: '',
    status: 'completed',
    createdAt: new Date(2026, 10, 13, 12, 0, 0),
    ...overrides,
  };
}

describe('report period bounds', () => {
  it('calculates Saturday-starting weeks and navigates previous/next periods cleanly', () => {
    // Friday Nov 13, 2026 -> Saturday-starting week is Nov 7 .. Nov 13, 2026
    const ref = new Date(2026, 10, 13, 15, 0, 0);
    const current = getReportPeriodBounds('weekly', 0, 6, ref);
    assert.equal(current.startYmd, '2026-11-07');
    assert.equal(current.endYmd, '2026-11-13');
    assert.equal(current.start.getDay(), 6);

    const prev = getReportPeriodBounds('weekly', -1, 6, ref);
    assert.equal(prev.startYmd, '2026-10-31');
    assert.equal(prev.endYmd, '2026-11-06');

    // Monday-starting week for Fri Nov 13, 2026 is Nov 9 .. Nov 15, 2026
    const monWeek = getReportPeriodBounds('weekly', 0, 1, ref);
    assert.equal(monWeek.startYmd, '2026-11-09');
    assert.equal(monWeek.endYmd, '2026-11-15');
    assert.equal(monWeek.start.getDay(), 1);
  });

  it('calculates monthly bounds across year transitions', () => {
    const ref = new Date(2026, 0, 15, 10, 0, 0); // Jan 2026
    const current = getReportPeriodBounds('monthly', 0, 6, ref);
    assert.equal(current.startYmd, '2026-01-01');
    assert.equal(current.endYmd, '2026-01-31');

    const prev = getReportPeriodBounds('monthly', -1, 6, ref);
    assert.equal(prev.startYmd, '2025-12-01');
    assert.equal(prev.endYmd, '2025-12-31');
  });
});

describe('period report metrics, void exclusion, and stock analytics', () => {
  it('computes profit, discounts, % change, daily series, top 10, unsold, low stock, valuation, and noted sales', () => {
    const ref = new Date(2026, 10, 13, 14, 0, 0); // Fri Nov 13, 2026
    const products: Product[] = [
      makeProduct({ id: 'p1', name: 'Train', sellingPrice: 28000, costPrice: 18000, quantityInStock: 5, reorderLevel: 3 }),
      makeProduct({ id: 'p2', name: 'RC Car', sellingPrice: 40000, costPrice: 25000, quantityInStock: 2, reorderLevel: 3 }),
      makeProduct({ id: 'p3', name: 'Archived Doll', sellingPrice: 10000, costPrice: 5000, quantityInStock: 10, isArchived: true }),
    ];

    const sales: Sale[] = [
      // Current week: 2x Train @ 25,000 (list 28,000, cost 18,000) -> rev 50,000, profit 14,000, discount 6,000
      makeSale({
        id: 's-curr-1',
        note: 'Paid via FIB',
        createdAt: new Date(2026, 10, 13, 10, 0, 0),
      }),
      // Voided sale in current week MUST be ignored!
      makeSale({
        id: 's-voided',
        status: 'voided',
        note: 'Voided FIB',
        totalAmount: 999000,
        createdAt: new Date(2026, 10, 12, 11, 0, 0),
      }),
      // Previous week: 1x Train @ 25,000 -> totalSales 25,000 -> current vs prev is +100%
      makeSale({
        id: 's-prev-1',
        items: [
          {
            productId: 'p1',
            productName: 'Train',
            barcode: '2048192038471',
            quantity: 1,
            listPrice: 25000,
            unitPrice: 25000,
            costPrice: 18000,
            lineTotal: 25000,
          },
        ],
        totalAmount: 25000,
        totalCost: 18000,
        itemCount: 1,
        createdAt: new Date(2026, 10, 4, 10, 0, 0),
      }),
    ];

    const report = buildPeriodReport(sales, products, {
      periodType: 'weekly',
      periodOffset: 0,
      weekStartDay: 6,
      referenceDate: ref,
    });

    assert.equal(report.summary.totalSales, 50000);
    assert.equal(report.summary.salesCount, 1);
    assert.equal(report.summary.itemsSold, 2);
    assert.equal(report.summary.averageSaleValue, 50000);
    assert.equal(report.summary.grossProfit, 14000);
    assert.equal(report.summary.totalDiscountGiven, 6000);
    assert.equal(report.changes.totalSalesPct, 100);
    assert.equal(report.changes.grossProfitPct, 100);
    assert.equal(report.dailySeries.length, 7);
    assert.equal(report.dailySeries[6].totalSales, 50000);

    // Top products excludes voided RC Car
    assert.deepEqual(
      report.topProducts.map((p) => p.productId),
      ['p1']
    );

    // Unsold in stock excludes archived p3, includes p2 (RC Car)
    assert.deepEqual(
      report.unsoldInStockProducts.map((p) => p.productId),
      ['p2']
    );

    // Low stock includes p2 (stock 2 <= reorder 3)
    assert.deepEqual(
      report.lowStockProducts.map((p) => p.productId),
      ['p2']
    );

    // Stock valuation across active products (p1 + p2):
    // Cost: 5*18000 + 2*25000 = 140000
    // Selling: 5*28000 + 2*40000 = 220000
    assert.equal(report.stockValuation.totalCostValue, 140000);
    assert.equal(report.stockValuation.totalSellingValue, 220000);

    // Noted sales excludes voided sale
    assert.deepEqual(
      report.notedSales.map((s) => s.id),
      ['s-curr-1']
    );
  });

  it('handles zero previous period safely in percent change', () => {
    assert.equal(computePercentChange(50000, 0), null);
    assert.equal(computePercentChange(150, 100), 50);
    assert.equal(computePercentChange(50, 100), -50);
  });

  it('properly escapes CSV cells with commas, quotes, and newlines', () => {
    assert.equal(escapeCsvCell('Plain'), 'Plain');
    assert.equal(escapeCsvCell('Toy, "Special"'), '"Toy, ""Special"""');
    const report = buildPeriodReport([], [makeProduct()], {
      periodType: 'weekly',
      periodOffset: 0,
      weekStartDay: 6,
      referenceDate: new Date(2026, 10, 13, 12, 0, 0),
    });
    const csv = buildReportCsv(report, 'Little Wonders', 'IQD');
    assert.ok(csv.includes('Little Wonders'));
    assert.ok(csv.includes('SUMMARY'));
    assert.ok(csv.includes('TOP 10 BEST-SELLING PRODUCTS'));
  });
});
