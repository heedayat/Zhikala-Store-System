import type { Product, Sale } from '../types/inventory';
import { isLowStock } from './formatters';
import { getTranslations, getWeekdayLabelLocalized, type AppLanguage } from './i18n';
import { formatLocalYmd, formatSaleDateTime, normalizePaymentMethod } from './sales';

export type ReportPeriodType = 'weekly' | 'monthly';

export const DEFAULT_WEEK_START_DAY = 6; // Saturday

export const WEEKDAY_OPTIONS: { value: number; label: string }[] = [
  { value: 6, label: 'Saturday' },
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
];

export function normalizeWeekStartDay(day: number | undefined | null): number {
  if (typeof day === 'number' && Number.isInteger(day) && day >= 0 && day <= 6) {
    return day;
  }
  return DEFAULT_WEEK_START_DAY;
}

export function getWeekStartDayName(day: number, lang: AppLanguage = 'en'): string {
  const normalized = normalizeWeekStartDay(day);
  if (lang === 'ku') {
    return getWeekdayLabelLocalized(normalized, 'ku');
  }
  return WEEKDAY_OPTIONS.find((opt) => opt.value === normalized)?.label ?? 'Saturday';
}

export interface ReportPeriodBounds {
  periodType: ReportPeriodType;
  periodOffset: number;
  weekStartDay: number;
  start: Date;
  end: Date;
  startMs: number;
  endMs: number;
  prevStart: Date;
  prevEnd: Date;
  prevStartMs: number;
  prevEndMs: number;
  label: string;
  prevLabel: string;
  startYmd: string;
  endYmd: string;
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function endOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function formatWeekRangeLabel(start: Date, end: Date, lang: AppLanguage = 'en'): string {
  const sameYear = start.getFullYear() === end.getFullYear();
  const sameMonth = sameYear && start.getMonth() === end.getMonth();

  if (lang === 'ku') {
    const monthsShort = getTranslations('ku').monthsShort;
    const startMonth = monthsShort[start.getMonth() as keyof typeof monthsShort];
    const endMonth = monthsShort[end.getMonth() as keyof typeof monthsShort];
    if (sameMonth) {
      return `${start.getDate()}–${end.getDate()} ${startMonth} ${end.getFullYear()}`;
    }
    if (sameYear) {
      return `${start.getDate()} ${startMonth} – ${end.getDate()} ${endMonth} ${end.getFullYear()}`;
    }
    return `${start.getDate()} ${startMonth} ${start.getFullYear()} – ${end.getDate()} ${endMonth} ${end.getFullYear()}`;
  }

  if (sameMonth) {
    const monthStr = new Intl.DateTimeFormat('en-US', { month: 'short' }).format(start);
    return `${monthStr} ${start.getDate()} – ${end.getDate()}, ${end.getFullYear()}`;
  }
  if (sameYear) {
    const startStr = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(
      start
    );
    const endStr = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(end);
    return `${startStr} – ${endStr}`;
  }
  const fullFmt = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return `${fullFmt.format(start)} – ${fullFmt.format(end)}`;
}

function formatMonthLabel(date: Date, lang: AppLanguage = 'en'): string {
  if (lang === 'ku') {
    const months = getTranslations('ku').months;
    const monthName = months[date.getMonth() as keyof typeof months];
    return `${monthName} ${date.getFullYear()}`;
  }
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(date);
}

export function getReportPeriodBounds(
  periodType: ReportPeriodType,
  periodOffset: number,
  weekStartDay: number = DEFAULT_WEEK_START_DAY,
  referenceDate: Date = new Date(),
  lang: AppLanguage = 'en'
): ReportPeriodBounds {
  const safeStartDay = normalizeWeekStartDay(weekStartDay);
  const safeOffset = Number.isFinite(periodOffset) ? Math.trunc(periodOffset) : 0;

  if (periodType === 'weekly') {
    const todayStart = startOfLocalDay(referenceDate);
    const daysSinceWeekStart = (todayStart.getDay() - safeStartDay + 7) % 7;

    const start = new Date(todayStart);
    start.setDate(todayStart.getDate() - daysSinceWeekStart + safeOffset * 7);

    const endDay = new Date(start);
    endDay.setDate(start.getDate() + 6);
    const end = endOfLocalDay(endDay);

    const prevStart = new Date(start);
    prevStart.setDate(start.getDate() - 7);
    const prevEndDay = new Date(start);
    prevEndDay.setDate(start.getDate() - 1);
    const prevEnd = endOfLocalDay(prevEndDay);

    return {
      periodType,
      periodOffset: safeOffset,
      weekStartDay: safeStartDay,
      start,
      end,
      startMs: start.getTime(),
      endMs: end.getTime(),
      prevStart,
      prevEnd,
      prevStartMs: prevStart.getTime(),
      prevEndMs: prevEnd.getTime(),
      label: formatWeekRangeLabel(start, end, lang),
      prevLabel: formatWeekRangeLabel(prevStart, prevEnd, lang),
      startYmd: formatLocalYmd(start),
      endYmd: formatLocalYmd(end),
    };
  }

  // Monthly
  const start = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth() + safeOffset,
    1,
    0,
    0,
    0,
    0
  );
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999);
  const prevStart = new Date(start.getFullYear(), start.getMonth() - 1, 1, 0, 0, 0, 0);
  const prevEnd = new Date(start.getFullYear(), start.getMonth(), 0, 23, 59, 59, 999);

  return {
    periodType,
    periodOffset: safeOffset,
    weekStartDay: safeStartDay,
    start,
    end,
    startMs: start.getTime(),
    endMs: end.getTime(),
    prevStart,
    prevEnd,
    prevStartMs: prevStart.getTime(),
    prevEndMs: prevEnd.getTime(),
    label: formatMonthLabel(start, lang),
    prevLabel: formatMonthLabel(prevStart, lang),
    startYmd: formatLocalYmd(start),
    endYmd: formatLocalYmd(end),
  };
}

export interface PeriodMetricsSummary {
  totalSales: number;
  cashSalesTotal: number;
  cashSalesCount: number;
  digitalSalesTotal: number;
  digitalSalesCount: number;
  fibSalesTotal: number;
  cardSalesTotal: number;
  salesCount: number;
  itemsSold: number;
  averageSaleValue: number;
  grossProfit: number;
  totalDiscountGiven: number;
}

export interface PeriodPercentChanges {
  totalSalesPct: number | null;
  salesCountPct: number | null;
  itemsSoldPct: number | null;
  averageSaleValuePct: number | null;
  grossProfitPct: number | null;
  totalDiscountGivenPct: number | null;
}

export interface DailySalesPoint {
  dateYmd: string;
  axisLabel: string;
  fullDateLabel: string;
  totalSales: number;
  grossProfit: number;
  salesCount: number;
  itemsSold: number;
}

export interface TopSellingProductRow {
  productId: string;
  productName: string;
  quantity: number;
  revenue: number;
  grossProfit: number;
}

export interface UnsoldStockProductRow {
  productId: string;
  name: string;
  category: string;
  variantLabel: string;
  quantityInStock: number;
  costValue: number;
  sellingValue: number;
}

export interface LowStockProductRow {
  productId: string;
  name: string;
  category: string;
  variantLabel: string;
  quantityInStock: number;
  reorderLevel: number;
  costValue: number;
}

export interface StockValuationSummary {
  activeProductCount: number;
  totalUnits: number;
  totalCostValue: number;
  totalSellingValue: number;
  potentialProfit: number;
}

export interface PeriodReport {
  period: ReportPeriodBounds;
  summary: PeriodMetricsSummary;
  previousSummary: PeriodMetricsSummary;
  changes: PeriodPercentChanges;
  dailySeries: DailySalesPoint[];
  topProducts: TopSellingProductRow[];
  unsoldInStockProducts: UnsoldStockProductRow[];
  lowStockProducts: LowStockProductRow[];
  stockValuation: StockValuationSummary;
  notedSales: Sale[];
}

export function computePercentChange(current: number, previous: number): number | null {
  if (previous === 0) {
    return null;
  }
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  return Math.round(pct * 10) / 10;
}

function summarizeCompletedSales(sales: Sale[]): PeriodMetricsSummary {
  let totalSales = 0;
  let cashSalesTotal = 0;
  let cashSalesCount = 0;
  let digitalSalesTotal = 0;
  let digitalSalesCount = 0;
  let fibSalesTotal = 0;
  let cardSalesTotal = 0;
  let itemsSold = 0;
  let totalCost = 0;
  let totalDiscountGiven = 0;

  for (const sale of sales) {
    totalSales += sale.totalAmount;
    const method = normalizePaymentMethod(sale.paymentMethod);
    if (method === 'fib') {
      fibSalesTotal += sale.totalAmount;
      digitalSalesTotal += sale.totalAmount;
      digitalSalesCount += 1;
    } else if (method === 'card') {
      cardSalesTotal += sale.totalAmount;
      digitalSalesTotal += sale.totalAmount;
      digitalSalesCount += 1;
    } else {
      cashSalesTotal += sale.totalAmount;
      cashSalesCount += 1;
    }
    for (const item of sale.items) {
      itemsSold += item.quantity;
      totalCost += item.costPrice * item.quantity;
      totalDiscountGiven += (item.listPrice - item.unitPrice) * item.quantity;
    }
  }

  const salesCount = sales.length;
  const averageSaleValue =
    salesCount > 0 ? Math.round((totalSales / salesCount) * 100) / 100 : 0;
  const grossProfit = Math.round((totalSales - totalCost) * 100) / 100;

  return {
    totalSales: Math.round(totalSales * 100) / 100,
    cashSalesTotal: Math.round(cashSalesTotal * 100) / 100,
    cashSalesCount,
    digitalSalesTotal: Math.round(digitalSalesTotal * 100) / 100,
    digitalSalesCount,
    fibSalesTotal: Math.round(fibSalesTotal * 100) / 100,
    cardSalesTotal: Math.round(cardSalesTotal * 100) / 100,
    salesCount,
    itemsSold,
    averageSaleValue,
    grossProfit,
    totalDiscountGiven: Math.round(totalDiscountGiven * 100) / 100,
  };
}

export function buildPeriodReport(
  allSales: Sale[],
  allProducts: Product[],
  options: {
    periodType: ReportPeriodType;
    periodOffset: number;
    weekStartDay?: number;
    referenceDate?: Date;
    lang?: AppLanguage;
  }
): PeriodReport {
  const lang: AppLanguage = options.lang ?? 'en';
  const period = getReportPeriodBounds(
    options.periodType,
    options.periodOffset,
    options.weekStartDay ?? DEFAULT_WEEK_START_DAY,
    options.referenceDate ?? new Date(),
    lang
  );

  // Ignore voided sales everywhere in reports
  const completedSales = allSales.filter((s) => s.status !== 'voided');

  const periodSales = completedSales.filter((s) => {
    const ts = s.createdAt.getTime();
    return ts >= period.startMs && ts <= period.endMs;
  });

  const previousSales = completedSales.filter((s) => {
    const ts = s.createdAt.getTime();
    return ts >= period.prevStartMs && ts <= period.prevEndMs;
  });

  const summary = summarizeCompletedSales(periodSales);
  const previousSummary = summarizeCompletedSales(previousSales);

  const changes: PeriodPercentChanges = {
    totalSalesPct: computePercentChange(summary.totalSales, previousSummary.totalSales),
    salesCountPct: computePercentChange(summary.salesCount, previousSummary.salesCount),
    itemsSoldPct: computePercentChange(summary.itemsSold, previousSummary.itemsSold),
    averageSaleValuePct: computePercentChange(
      summary.averageSaleValue,
      previousSummary.averageSaleValue
    ),
    grossProfitPct: computePercentChange(summary.grossProfit, previousSummary.grossProfit),
    totalDiscountGivenPct: computePercentChange(
      summary.totalDiscountGiven,
      previousSummary.totalDiscountGiven
    ),
  };

  // Daily series covering every single calendar day in [period.start, period.end]
  const dailyMap = new Map<string, DailySalesPoint>();
  const dayCursor = new Date(period.start);
  const shortWeekdayFmt = new Intl.DateTimeFormat('en-US', { weekday: 'short' });
  const fullDateFmt = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const kuWeekdaysShort = getTranslations('ku').weekdaysShort;
  const kuMonthsShort = getTranslations('ku').monthsShort;

  while (dayCursor.getTime() <= period.endMs) {
    const ymd = formatLocalYmd(dayCursor);
    const dayIdx = dayCursor.getDay() as keyof typeof kuWeekdaysShort;
    const monthIdx = dayCursor.getMonth() as keyof typeof kuMonthsShort;

    const axisLabel =
      lang === 'ku'
        ? period.periodType === 'weekly'
          ? `${kuWeekdaysShort[dayIdx]} ${dayCursor.getDate()}`
          : String(dayCursor.getDate())
        : period.periodType === 'weekly'
        ? `${shortWeekdayFmt.format(dayCursor)} ${dayCursor.getDate()}`
        : String(dayCursor.getDate());

    const fullDateLabel =
      lang === 'ku'
        ? `${kuWeekdaysShort[dayIdx]}، ${dayCursor.getDate()} ${kuMonthsShort[monthIdx]} ${dayCursor.getFullYear()}`
        : fullDateFmt.format(dayCursor);

    dailyMap.set(ymd, {
      dateYmd: ymd,
      axisLabel,
      fullDateLabel,
      totalSales: 0,
      grossProfit: 0,
      salesCount: 0,
      itemsSold: 0,
    });
    dayCursor.setDate(dayCursor.getDate() + 1);
  }

  // Product sales aggregation in period
  const soldProductMap = new Map<
    string,
    { productId: string; productName: string; quantity: number; revenue: number; grossProfit: number }
  >();

  for (const sale of periodSales) {
    const ymd = formatLocalYmd(sale.createdAt);
    const dayBucket = dailyMap.get(ymd);

    let saleItemsCount = 0;
    let saleCost = 0;

    for (const item of sale.items) {
      saleItemsCount += item.quantity;
      const itemCost = item.costPrice * item.quantity;
      saleCost += itemCost;
      const itemProfit = item.lineTotal - itemCost;

      const existing = soldProductMap.get(item.productId);
      if (existing) {
        existing.quantity += item.quantity;
        existing.revenue += item.lineTotal;
        existing.grossProfit += itemProfit;
      } else {
        soldProductMap.set(item.productId, {
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          revenue: item.lineTotal,
          grossProfit: itemProfit,
        });
      }
    }

    if (dayBucket) {
      dayBucket.totalSales += sale.totalAmount;
      dayBucket.grossProfit += sale.totalAmount - saleCost;
      dayBucket.salesCount += 1;
      dayBucket.itemsSold += saleItemsCount;
    }
  }

  const dailySeries = Array.from(dailyMap.values());

  const topProducts = Array.from(soldProductMap.values())
    .sort((a, b) => {
      if (b.quantity !== a.quantity) return b.quantity - a.quantity;
      if (b.revenue !== a.revenue) return b.revenue - a.revenue;
      return a.productName.localeCompare(b.productName, undefined, { sensitivity: 'base' });
    })
    .slice(0, 10);

  const activeProducts = allProducts.filter((p) => !p.isArchived);

  const unsoldInStockProducts: UnsoldStockProductRow[] = activeProducts
    .filter((p) => p.quantityInStock > 0 && !soldProductMap.has(p.id))
    .map((p) => ({
      productId: p.id,
      name: p.name,
      category: p.category,
      variantLabel: p.variantLabel ?? '',
      quantityInStock: p.quantityInStock,
      costValue: p.quantityInStock * p.costPrice,
      sellingValue: p.quantityInStock * p.sellingPrice,
    }))
    .sort((a, b) => {
      if (b.costValue !== a.costValue) return b.costValue - a.costValue;
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });

  const lowStockProducts: LowStockProductRow[] = activeProducts
    .filter((p) => isLowStock(p))
    .map((p) => ({
      productId: p.id,
      name: p.name,
      category: p.category,
      variantLabel: p.variantLabel ?? '',
      quantityInStock: p.quantityInStock,
      reorderLevel: p.reorderLevel ?? 0,
      costValue: Math.max(0, p.quantityInStock) * p.costPrice,
    }))
    .sort((a, b) => {
      const aDeficit = a.quantityInStock - a.reorderLevel;
      const bDeficit = b.quantityInStock - b.reorderLevel;
      if (aDeficit !== bDeficit) return aDeficit - bDeficit;
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });

  let totalUnits = 0;
  let totalCostValue = 0;
  let totalSellingValue = 0;
  for (const p of activeProducts) {
    const units = Math.max(0, p.quantityInStock);
    totalUnits += units;
    totalCostValue += units * p.costPrice;
    totalSellingValue += units * p.sellingPrice;
  }

  const stockValuation: StockValuationSummary = {
    activeProductCount: activeProducts.length,
    totalUnits,
    totalCostValue,
    totalSellingValue,
    potentialProfit: totalSellingValue - totalCostValue,
  };

  const notedSales = periodSales
    .filter((s) => (s.note ?? '').trim().length > 0)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return {
    period,
    summary,
    previousSummary,
    changes,
    dailySeries,
    topProducts,
    unsoldInStockProducts,
    lowStockProducts,
    stockValuation,
    notedSales,
  };
}

export function escapeCsvCell(value: string | number): string {
  const str = String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function csvRow(cells: (string | number)[]): string {
  return cells.map(escapeCsvCell).join(',');
}

export function buildReportCsv(
  report: PeriodReport,
  shopName: string,
  currency: string
): string {
  const lines: string[] = [];

  lines.push(csvRow(['Shop', shopName]));
  lines.push(
    csvRow([
      'Report Type',
      report.period.periodType === 'weekly' ? 'Weekly' : 'Monthly',
    ])
  );
  lines.push(csvRow(['Period', report.period.label]));
  lines.push(csvRow(['Previous Period', report.period.prevLabel]));
  if (report.period.periodType === 'weekly') {
    lines.push(csvRow(['Week Starts On', getWeekStartDayName(report.period.weekStartDay)]));
  }
  lines.push(csvRow(['Currency', currency]));
  lines.push('');

  lines.push(csvRow(['SUMMARY', 'Current Period', 'Previous Period', '% Change']));
  lines.push(
    csvRow([
      `Total Sales (${currency})`,
      report.summary.totalSales,
      report.previousSummary.totalSales,
      report.changes.totalSalesPct === null ? 'N/A' : `${report.changes.totalSalesPct}%`,
    ])
  );
  lines.push(
    csvRow([
      `Cash Sales (${currency})`,
      report.summary.cashSalesTotal,
      report.previousSummary.cashSalesTotal,
      '—',
    ])
  );
  lines.push(
    csvRow([
      `FIB / Digital Sales (${currency})`,
      report.summary.digitalSalesTotal,
      report.previousSummary.digitalSalesTotal,
      '—',
    ])
  );
  lines.push(
    csvRow([
      `Gross Profit (${currency})`,
      report.summary.grossProfit,
      report.previousSummary.grossProfit,
      report.changes.grossProfitPct === null ? 'N/A' : `${report.changes.grossProfitPct}%`,
    ])
  );
  lines.push(
    csvRow([
      'Number of Sales',
      report.summary.salesCount,
      report.previousSummary.salesCount,
      report.changes.salesCountPct === null ? 'N/A' : `${report.changes.salesCountPct}%`,
    ])
  );
  lines.push(
    csvRow([
      'Items Sold',
      report.summary.itemsSold,
      report.previousSummary.itemsSold,
      report.changes.itemsSoldPct === null ? 'N/A' : `${report.changes.itemsSoldPct}%`,
    ])
  );
  lines.push(
    csvRow([
      `Average Sale Value (${currency})`,
      report.summary.averageSaleValue,
      report.previousSummary.averageSaleValue,
      report.changes.averageSaleValuePct === null
        ? 'N/A'
        : `${report.changes.averageSaleValuePct}%`,
    ])
  );
  lines.push(
    csvRow([
      `Total Discount Given (${currency})`,
      report.summary.totalDiscountGiven,
      report.previousSummary.totalDiscountGiven,
      report.changes.totalDiscountGivenPct === null
        ? 'N/A'
        : `${report.changes.totalDiscountGivenPct}%`,
    ])
  );
  lines.push('');

  lines.push(csvRow(['CURRENT STOCK VALUATION', 'Value']));
  lines.push(csvRow(['Active Products', report.stockValuation.activeProductCount]));
  lines.push(csvRow(['Total Units in Stock', report.stockValuation.totalUnits]));
  lines.push(csvRow([`Total Stock Value at Cost (${currency})`, report.stockValuation.totalCostValue]));
  lines.push(
    csvRow([`Total Stock Value at Selling Price (${currency})`, report.stockValuation.totalSellingValue])
  );
  lines.push('');

  lines.push(
    csvRow([
      'SALES PER DAY',
      'Sales Count',
      'Items Sold',
      `Total Sales (${currency})`,
      `Gross Profit (${currency})`,
    ])
  );
  for (const day of report.dailySeries) {
    lines.push(csvRow([day.dateYmd, day.salesCount, day.itemsSold, day.totalSales, day.grossProfit]));
  }
  lines.push('');

  lines.push(
    csvRow([
      'TOP 10 BEST-SELLING PRODUCTS',
      'Product',
      'Quantity Sold',
      `Revenue (${currency})`,
      `Gross Profit (${currency})`,
    ])
  );
  report.topProducts.forEach((item, idx) => {
    lines.push(csvRow([idx + 1, item.productName, item.quantity, item.revenue, item.grossProfit]));
  });
  lines.push('');

  lines.push(
    csvRow([
      'IN STOCK WITH NO SALES IN PERIOD',
      'Category',
      'Stock Qty',
      `Value at Cost (${currency})`,
      `Value at Selling Price (${currency})`,
    ])
  );
  for (const prod of report.unsoldInStockProducts) {
    lines.push(
      csvRow([
        prod.name,
        prod.category || '',
        prod.quantityInStock,
        prod.costValue,
        prod.sellingValue,
      ])
    );
  }
  lines.push('');

  lines.push(
    csvRow([
      'CURRENT LOW-STOCK PRODUCTS',
      'Category',
      'Current Stock',
      'Reorder Level',
      `Value at Cost (${currency})`,
    ])
  );
  for (const prod of report.lowStockProducts) {
    lines.push(
      csvRow([
        prod.name,
        prod.category || '',
        prod.quantityInStock,
        prod.reorderLevel,
        prod.costValue,
      ])
    );
  }
  lines.push('');

  lines.push(csvRow(['SALES WITH NOTES IN PERIOD', 'Items', 'Note', `Total (${currency})`]));
  for (const sale of report.notedSales) {
    const itemsSummary = sale.items.map((i) => `${i.quantity}x ${i.productName}`).join('; ');
    lines.push(
      csvRow([
        formatSaleDateTime(sale.createdAt),
        itemsSummary,
        sale.note ?? '',
        sale.totalAmount,
      ])
    );
  }

  return lines.join('\r\n');
}
