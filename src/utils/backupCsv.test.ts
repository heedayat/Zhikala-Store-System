import test from 'node:test';
import assert from 'node:assert/strict';
import type { Product, Sale, StockMovement } from '../types/inventory';
import {
  buildProductsBackupCsv,
  buildSalesBackupCsv,
  buildStockMovementsBackupCsv,
  getBackupFilename,
} from './backupCsv';

test('backup CSV exporters format products, sales, and stock movements safely', () => {
  const products: Product[] = [
    {
      id: 'p1',
      ownerId: 'u1',
      name: 'Bricks "Deluxe", 500pc',
      barcode: '2012345678901',
      category: 'Blocks',
      sellingPrice: 35000,
      costPrice: 22000,
      quantityInStock: 10,
      reorderLevel: 4,
      photos: ['data:image/jpeg;base64,abc'],
      brand: 'BlockCraft',
      isArchived: false,
      createdAt: new Date(2026, 10, 1, 9, 0),
      updatedAt: new Date(2026, 10, 13, 12, 0),
    },
  ];

  const sales: Sale[] = [
    {
      id: 's1',
      ownerId: 'u1',
      items: [
        {
          productId: 'p1',
          productName: 'Bricks "Deluxe", 500pc',
          barcode: '2012345678901',
          quantity: 2,
          listPrice: 35000,
          unitPrice: 32000,
          costPrice: 22000,
          lineTotal: 64000,
        },
      ],
      totalAmount: 64000,
      totalCost: 44000,
      itemCount: 2,
      paymentMethod: 'cash',
      note: 'Paid via FIB',
      status: 'completed',
      createdAt: new Date(2026, 10, 13, 14, 0),
    },
  ];

  const movements: StockMovement[] = [
    {
      id: 'm1',
      ownerId: 'u1',
      productId: 'p1',
      productName: 'Bricks "Deluxe", 500pc',
      type: 'sale',
      quantityChange: -2,
      reason: 'Sale',
      saleId: 's1',
      note: 'Paid via FIB',
      createdAt: new Date(2026, 10, 13, 14, 0),
    },
  ];

  const prodCsv = buildProductsBackupCsv(products, 'IQD');
  assert.match(prodCsv, /Selling Price \(IQD\)/);
  assert.match(prodCsv, /"Bricks ""Deluxe"", 500pc"/);
  assert.match(prodCsv, /,35000,22000,10,4,Active,/);

  const salesCsv = buildSalesBackupCsv(sales, 'IQD');
  assert.match(salesCsv, /Total Discount \(IQD\)/);
  assert.match(salesCsv, /,70000,6000,64000,44000,20000,Paid via FIB,/);

  const movCsv = buildStockMovementsBackupCsv(movements, 'IQD');
  assert.match(movCsv, /Movement ID,Date,Product ID,Product Name,Type,Quantity Change/);
  assert.match(movCsv, /,sale,-2,Sale,,s1,Paid via FIB/);

  assert.equal(
    getBackupFilename('Little Wonders', 'products', new Date(2026, 10, 13)),
    'little-wonders-products-backup-2026-11-13.csv'
  );
});
