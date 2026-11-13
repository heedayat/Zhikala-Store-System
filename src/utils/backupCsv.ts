import type { Product, Sale, StockMovement } from '../types/inventory';
import { escapeCsvCell } from './reports';
import { formatLocalYmd, formatSaleDateTime } from './sales';

function toCsv(rows: (string | number)[][]): string {
  return rows.map((row) => row.map(escapeCsvCell).join(',')).join('\r\n');
}

export function sanitizeCsvFileSlug(shopName: string): string {
  return (
    shopName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'shop'
  );
}

export function downloadCsvFile(filename: string, csvContent: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function buildProductsBackupCsv(products: Product[], currency: string): string {
  const rows: (string | number)[][] = [
    [
      'Product ID',
      'Name',
      'Barcode',
      'Category',
      `Selling Price (${currency})`,
      `Cost Price (${currency})`,
      'Quantity In Stock',
      'Reorder Level',
      'Status',
      'Brand',
      'Age Range',
      'Supplier',
      'Variant Label',
      'Notes',
      'Photo Count',
      'Created At',
      'Updated At',
    ],
  ];

  const sorted = [...products].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  );

  for (const p of sorted) {
    rows.push([
      p.id,
      p.name,
      p.barcode ?? '',
      p.category ?? '',
      p.sellingPrice,
      p.costPrice,
      p.quantityInStock,
      p.reorderLevel ?? '',
      p.isArchived ? 'Archived' : 'Active',
      p.brand ?? '',
      p.ageRange ?? '',
      p.supplier ?? '',
      p.variantLabel ?? '',
      p.notes ?? '',
      p.photos?.length ?? 0,
      p.createdAt ? formatSaleDateTime(p.createdAt) : '',
      p.updatedAt ? formatSaleDateTime(p.updatedAt) : '',
    ]);
  }

  return toCsv(rows);
}

export function buildSalesBackupCsv(sales: Sale[], currency: string): string {
  const rows: (string | number)[][] = [
    [
      'Sale ID',
      'Date',
      'Status',
      'Payment Method',
      'Item Count',
      `Total List Price (${currency})`,
      `Total Discount (${currency})`,
      `Total Sold (${currency})`,
      `Total Cost (${currency})`,
      `Gross Profit (${currency})`,
      'Note',
      'Items Breakdown',
      'Voided At',
    ],
  ];

  const sorted = [...sales].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  for (const s of sorted) {
    const listTotal = s.items.reduce((sum, item) => sum + item.listPrice * item.quantity, 0);
    const totalDiscount = listTotal - s.totalAmount;
    const grossProfit = s.totalAmount - s.totalCost;
    const itemsSummary = s.items
      .map(
        (item) =>
          `${item.quantity}x ${item.productName} @ ${item.unitPrice} (list ${item.listPrice}, cost ${item.costPrice})`
      )
      .join(' | ');

    rows.push([
      s.id,
      formatSaleDateTime(s.createdAt),
      s.status,
      s.paymentMethod,
      s.itemCount,
      listTotal,
      totalDiscount,
      s.totalAmount,
      s.totalCost,
      grossProfit,
      s.note ?? '',
      itemsSummary,
      s.voidedAt ? formatSaleDateTime(s.voidedAt) : '',
    ]);
  }

  return toCsv(rows);
}

export function buildStockMovementsBackupCsv(
  movements: StockMovement[],
  currency: string
): string {
  const rows: (string | number)[][] = [
    [
      'Movement ID',
      'Date',
      'Product ID',
      'Product Name',
      'Type',
      'Quantity Change',
      'Reason',
      `Cost Price (${currency})`,
      'Sale ID',
      'Note',
    ],
  ];

  const sorted = [...movements].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  for (const m of sorted) {
    rows.push([
      m.id,
      formatSaleDateTime(m.createdAt),
      m.productId,
      m.productName,
      m.type,
      m.quantityChange,
      m.reason,
      m.costPrice !== null && m.costPrice !== undefined ? m.costPrice : '',
      m.saleId ?? '',
      m.note ?? '',
    ]);
  }

  return toCsv(rows);
}

export function getBackupFilename(
  shopName: string,
  dataset: 'products' | 'sales' | 'stock-movements',
  now: Date = new Date()
): string {
  return `${sanitizeCsvFileSlug(shopName)}-${dataset}-backup-${formatLocalYmd(now)}.csv`;
}
