import test from 'node:test';
import assert from 'node:assert/strict';
import type { Product, Sale } from '../types/inventory';
import {
  applyPendingSalesToProducts,
  computeNetworkSyncStatus,
  deserializeCachedProducts,
  deserializeCachedSales,
  hasUnsyncedLocalChanges,
  mergePendingSalesIntoList,
  serializeCachedProducts,
  serializeCachedSales,
  type PendingOfflineSale,
} from './offlineCache';

test('computeNetworkSyncStatus and hasUnsyncedLocalChanges reflect online, offline, and pending sync states', () => {
  assert.equal(
    computeNetworkSyncStatus({
      isOnline: true,
      hasPendingWrites: false,
      pendingOfflineQueueCount: 0,
    }),
    'online'
  );
  assert.equal(
    computeNetworkSyncStatus({
      isOnline: false,
      hasPendingWrites: false,
      pendingOfflineQueueCount: 0,
    }),
    'offline'
  );
  assert.equal(
    computeNetworkSyncStatus({
      isOnline: true,
      hasPendingWrites: true,
      pendingOfflineQueueCount: 0,
    }),
    'syncing'
  );
  assert.equal(
    computeNetworkSyncStatus({
      isOnline: true,
      hasPendingWrites: false,
      pendingOfflineQueueCount: 2,
    }),
    'syncing'
  );
  assert.equal(
    hasUnsyncedLocalChanges({
      isOnline: false,
      hasPendingWrites: true,
      pendingOfflineQueueCount: 0,
    }),
    true
  );
});

test('cached products and sales round-trip cleanly across JSON serialization', () => {
  const products: Product[] = [
    {
      id: 'p1',
      ownerId: 'u1',
      name: 'Train Set',
      barcode: '123456',
      category: 'Wooden Toys',
      sellingPrice: 25000,
      costPrice: 15000,
      quantityInStock: 8,
      reorderLevel: 3,
      photos: [],
      isArchived: false,
      createdAt: new Date('2026-11-10T12:00:00.000Z'),
      updatedAt: new Date('2026-11-11T12:00:00.000Z'),
    },
  ];
  const roundTrippedProducts = deserializeCachedProducts(serializeCachedProducts(products));
  assert.ok(roundTrippedProducts);
  assert.equal(roundTrippedProducts[0]?.name, 'Train Set');
  assert.equal(roundTrippedProducts[0]?.createdAt?.toISOString(), '2026-11-10T12:00:00.000Z');

  const sales: Sale[] = [
    {
      id: 's1',
      ownerId: 'u1',
      items: [
        {
          productId: 'p1',
          productName: 'Train Set',
          barcode: '123456',
          quantity: 2,
          listPrice: 25000,
          unitPrice: 24000,
          costPrice: 15000,
          lineTotal: 48000,
        },
      ],
      totalAmount: 48000,
      totalCost: 30000,
      itemCount: 2,
      paymentMethod: 'cash',
      status: 'completed',
      createdAt: new Date('2026-11-12T09:30:00.000Z'),
    },
  ];
  const roundTrippedSales = deserializeCachedSales(serializeCachedSales(sales));
  assert.ok(roundTrippedSales);
  assert.equal(roundTrippedSales[0]?.totalAmount, 48000);
  assert.equal(roundTrippedSales[0]?.createdAt.toISOString(), '2026-11-12T09:30:00.000Z');
});

test('applyPendingSalesToProducts and mergePendingSalesIntoList keep offline sales reflected without duplicates', () => {
  const products: Product[] = [
    {
      id: 'p1',
      ownerId: 'u1',
      name: 'Train Set',
      barcode: '123456',
      category: 'Wooden Toys',
      sellingPrice: 25000,
      costPrice: 15000,
      quantityInStock: 10,
      reorderLevel: 3,
      photos: [],
      isArchived: false,
    },
  ];
  const pending: PendingOfflineSale[] = [
    {
      saleId: 'offline-sale-1',
      ownerId: 'u1',
      items: [
        {
          productId: 'p1',
          productName: 'Train Set',
          barcode: '123456',
          quantity: 3,
          listPrice: 25000,
          unitPrice: 25000,
          costPrice: 15000,
          lineTotal: 75000,
        },
      ],
      totalAmount: 75000,
      totalCost: 45000,
      itemCount: 3,
      paymentMethod: 'cash',
      note: 'Offline cash sale',
      createdAtIso: '2026-11-14T10:00:00.000Z',
    },
  ];

  const adjustedProducts = applyPendingSalesToProducts(products, pending);
  assert.equal(adjustedProducts[0]?.quantityInStock, 7);

  const mergedSales = mergePendingSalesIntoList([], pending);
  assert.equal(mergedSales.length, 1);
  assert.equal(mergedSales[0]?.id, 'offline-sale-1');

  // When Firestore sync catches up with same saleId, avoid duplicate
  const mergedWithSynced = mergePendingSalesIntoList(mergedSales, pending);
  assert.equal(mergedWithSynced.length, 1);
});
