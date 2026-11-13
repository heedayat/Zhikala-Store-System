import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Package,
  Printer,
  TrendingUp,
} from 'lucide-react';
import type { Product, Sale, StockMovement } from '../types/inventory';
import {
  buildProductsBackupCsv,
  buildSalesBackupCsv,
  buildStockMovementsBackupCsv,
  downloadCsvFile,
  getBackupFilename,
} from '../utils/backupCsv';
import { formatActionError, formatCurrency, formatNumber } from '../utils/formatters';
import {
  buildPeriodReport,
  buildReportCsv,
  getWeekStartDayName,
  normalizeWeekStartDay,
  WEEKDAY_OPTIONS,
  type ReportPeriodType,
} from '../utils/reports';
import { formatSaleDateTime } from '../utils/sales';
import { ReceiptModal } from './ReceiptModal';
import { SaleDetailsModal } from './SaleDetailsModal';
import { SalesPerDayChart } from './SalesPerDayChart';

interface ReportsViewProps {
  products: Product[];
  sales: Sale[];
  movements: StockMovement[];
  isLoading: boolean;
  loadError: string | null;
  shopName: string;
  currency: string;
  weekStartDay: number;
  onChangeWeekStartDay: (day: number) => Promise<void>;
  onVoidSale: (saleId: string) => Promise<void>;
}

function PercentDelta({
  pct,
  prevFormatted,
}: {
  pct: number | null;
  prevFormatted: string;
}) {
  if (pct === null) {
    return (
      <p className="mt-1.5 text-xs text-slate-500 tabular-nums">
        vs prev: {prevFormatted}
      </p>
    );
  }

  const isUp = pct > 0;
  const isDown = pct < 0;
  const toneClass = isUp
    ? 'text-emerald-700'
    : isDown
      ? 'text-red-700'
      : 'text-slate-500';

  return (
    <p className="mt-1.5 text-xs flex items-center gap-1.5 flex-wrap tabular-nums">
      <span className={`inline-flex items-center gap-0.5 font-semibold font-mono ${toneClass}`}>
        {isUp ? (
          <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
        ) : isDown ? (
          <ArrowDownRight className="w-3.5 h-3.5" aria-hidden="true" />
        ) : null}
        {pct > 0 ? `+${pct}%` : `${pct}%`}
      </span>
      <span className="text-slate-500">vs {prevFormatted}</span>
    </p>
  );
}

export function ReportsView({
  products,
  sales,
  movements,
  isLoading,
  loadError,
  shopName,
  currency,
  weekStartDay,
  onChangeWeekStartDay,
  onVoidSale,
}: ReportsViewProps) {
  const [periodType, setPeriodType] = useState<ReportPeriodType>('weekly');
  const [periodOffset, setPeriodOffset] = useState<number>(0);
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [receiptSale, setReceiptSale] = useState<Sale | null>(null);
  const [isUpdatingWeekDay, setIsUpdatingWeekDay] = useState(false);

  const safeWeekStartDay = normalizeWeekStartDay(weekStartDay);

  const report = useMemo(
    () =>
      buildPeriodReport(sales, products, {
        periodType,
        periodOffset,
        weekStartDay: safeWeekStartDay,
      }),
    [sales, products, periodType, periodOffset, safeWeekStartDay]
  );

  const selectedSale = useMemo(
    () => (selectedSaleId ? sales.find((s) => s.id === selectedSaleId) ?? null : null),
    [sales, selectedSaleId]
  );

  useEffect(() => {
    function handleAfterPrint() {
      document.body.classList.remove('print-report-mode');
    }
    window.addEventListener('afterprint', handleAfterPrint);
    return () => {
      window.removeEventListener('afterprint', handleAfterPrint);
      document.body.classList.remove('print-report-mode');
    };
  }, []);

  function handlePeriodTypeChange(nextType: ReportPeriodType) {
    if (nextType === periodType) return;
    setPeriodType(nextType);
    setPeriodOffset(0);
  }

  function handlePrintReport() {
    document.body.classList.add('print-report-mode');
    window.print();
    setTimeout(() => {
      document.body.classList.remove('print-report-mode');
    }, 500);
  }

  function handleExportCsv() {
    const csv = buildReportCsv(report, shopName, currency);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeShop =
      shopName
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'shop';
    link.href = url;
    link.download = `${safeShop}-${periodType}-report-${report.period.startYmd}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async function handleWeekStartChange(nextDay: number) {
    setIsUpdatingWeekDay(true);
    try {
      await onChangeWeekStartDay(nextDay);
    } finally {
      setIsUpdatingWeekDay(false);
    }
  }

  const grossMarginPct =
    report.summary.totalSales > 0
      ? Math.round((report.summary.grossProfit / report.summary.totalSales) * 1000) / 10
      : 0;

  return (
    <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-white">
      {/* Top Header & Period Controls (hidden when printing report) */}
      <header className="print-hidden px-6 py-3.5 border-b border-slate-200 flex items-center justify-between gap-4 flex-wrap bg-white shrink-0">
        <div className="flex items-center gap-4 flex-wrap">
          <h1 className="text-lg font-bold text-slate-950 tracking-tight whitespace-nowrap">
            Reports
          </h1>

          {/* Weekly / Monthly tabs */}
          <div
            role="tablist"
            aria-label="Report period type"
            className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg"
          >
            <button
              type="button"
              role="tab"
              aria-selected={periodType === 'weekly'}
              onClick={() => handlePeriodTypeChange('weekly')}
              className={`h-8 px-3.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                periodType === 'weekly'
                  ? 'bg-white text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Weekly
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={periodType === 'monthly'}
              onClick={() => handlePeriodTypeChange('monthly')}
              className={`h-8 px-3.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                periodType === 'monthly'
                  ? 'bg-white text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Monthly
            </button>
          </div>

          {/* Previous / Current / Next Period Navigation */}
          <div className="inline-flex items-center gap-1 border border-slate-300 rounded-lg bg-white p-0.5">
            <button
              type="button"
              onClick={() => setPeriodOffset((prev) => prev - 1)}
              aria-label={periodType === 'weekly' ? 'Previous week' : 'Previous month'}
              className="w-8 h-8 rounded-md text-slate-600 hover:text-slate-950 hover:bg-slate-100 flex items-center justify-center transition-colors"
            >
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            </button>
            <span
              data-testid="report-period-label"
              className="px-2.5 text-xs font-semibold text-slate-950 tabular-nums whitespace-nowrap min-w-[148px] text-center"
            >
              {report.period.label}
            </span>
            <button
              type="button"
              disabled={periodOffset >= 0}
              onClick={() => setPeriodOffset((prev) => Math.min(0, prev + 1))}
              aria-label={periodType === 'weekly' ? 'Next week' : 'Next month'}
              className="w-8 h-8 rounded-md text-slate-600 hover:text-slate-950 hover:bg-slate-100 disabled:opacity-35 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
            >
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          {periodOffset < 0 && (
            <button
              type="button"
              onClick={() => setPeriodOffset(0)}
              className="h-9 px-3 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
            >
              {periodType === 'weekly' ? 'This week' : 'This month'}
            </button>
          )}
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {periodType === 'weekly' && (
            <div className="flex items-center gap-1.5">
              <label
                htmlFor="reports-week-start-select"
                className="text-xs text-slate-500 whitespace-nowrap"
              >
                Week starts
              </label>
              <select
                id="reports-week-start-select"
                aria-label="Week starts on"
                disabled={isUpdatingWeekDay}
                value={safeWeekStartDay}
                onChange={(e) => void handleWeekStartChange(Number(e.target.value))}
                className="h-9 px-2.5 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-600"
              >
                {WEEKDAY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="button"
            onClick={handleExportCsv}
            className="h-9 px-3.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            Export CSV
          </button>

          <button
            type="button"
            onClick={handlePrintReport}
            className="h-9 px-4 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <Printer className="w-3.5 h-3.5" aria-hidden="true" />
            Print report
          </button>
        </div>
      </header>

      {/* Scrollable Report Body */}
      <div
        id="reports-scroll-container"
        className="flex-1 overflow-y-auto bg-slate-50/50"
      >
        {loadError && (
          <div className="m-6 p-4 rounded-lg border border-red-200 bg-red-50 text-sm text-red-800">
            Could not load report data: {formatActionError(loadError, 'Unable to load store records.')}
          </div>
        )}

        {isLoading ? (
          <div className="p-6 space-y-5" aria-label="Loading reports">
            <div className="grid grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div
                  key={idx}
                  className="h-24 rounded-xl border border-slate-200 bg-white animate-pulse"
                />
              ))}
            </div>
            <div className="h-64 rounded-xl border border-slate-200 bg-white animate-pulse" />
          </div>
        ) : (
          <div id="printable-report" className="p-6 space-y-5 max-w-[1440px]">
            {/* Print-Only Report Header */}
            <div className="print-only pb-4 border-b border-slate-300 mb-4">
              <div className="flex items-baseline justify-between gap-4">
                <div>
                  <h1 className="text-xl font-bold text-slate-950">
                    {shopName} — {periodType === 'weekly' ? 'Weekly' : 'Monthly'} Report
                  </h1>
                  <p className="text-sm text-slate-700 mt-0.5">
                    Period: {report.period.label}
                    {periodType === 'weekly'
                      ? ` · Week starting ${getWeekStartDayName(safeWeekStartDay)}`
                      : ''}
                    {' · '}Compared against {report.period.prevLabel}
                  </p>
                </div>
                <p className="text-xs text-slate-500 font-mono">
                  Printed {formatSaleDateTime(new Date())}
                </p>
              </div>
            </div>

            {/* Period Comparison Context Line */}
            <div className="flex items-center justify-between gap-4 text-xs text-slate-500">
              <span>
                Showing completed cash sales (voided sales excluded) · Compared against{' '}
                <span className="font-medium text-slate-700">{report.period.prevLabel}</span>
              </span>
              {periodType === 'weekly' && (
                <span className="whitespace-nowrap">
                  Week starts on{' '}
                  <span className="font-medium text-slate-700">
                    {getWeekStartDayName(safeWeekStartDay)}
                  </span>
                </span>
              )}
            </div>

            {/* 6 Core Period KPIs (3x2 grid keeps IQD totals & deltas single-line at 1366x768) */}
            <section aria-label="Period performance metrics" className="grid grid-cols-3 gap-4 print-break-avoid">
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <p className="text-xs font-medium text-slate-500">Total Sales</p>
                <p
                  data-testid="report-total-sales"
                  className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-slate-950"
                >
                  {formatCurrency(report.summary.totalSales, currency)}
                </p>
                <PercentDelta
                  pct={report.changes.totalSalesPct}
                  prevFormatted={formatCurrency(report.previousSummary.totalSales, currency)}
                />
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-slate-500">Gross Profit</p>
                  {report.summary.totalSales > 0 && (
                    <span className="text-[11px] font-mono text-slate-500 tabular-nums">
                      {grossMarginPct}% margin
                    </span>
                  )}
                </div>
                <p
                  data-testid="report-gross-profit"
                  className={`mt-1.5 text-2xl font-bold font-mono tabular-nums ${
                    report.summary.grossProfit < 0 ? 'text-red-700' : 'text-emerald-700'
                  }`}
                >
                  {formatCurrency(report.summary.grossProfit, currency)}
                </p>
                <PercentDelta
                  pct={report.changes.grossProfitPct}
                  prevFormatted={formatCurrency(report.previousSummary.grossProfit, currency)}
                />
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <p className="text-xs font-medium text-slate-500">Average Sale Value</p>
                <p
                  data-testid="report-avg-sale"
                  className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-slate-950"
                >
                  {formatCurrency(report.summary.averageSaleValue, currency)}
                </p>
                <PercentDelta
                  pct={report.changes.averageSaleValuePct}
                  prevFormatted={formatCurrency(report.previousSummary.averageSaleValue, currency)}
                />
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <p className="text-xs font-medium text-slate-500">Number of Sales</p>
                <p
                  data-testid="report-sales-count"
                  className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-slate-950"
                >
                  {formatNumber(report.summary.salesCount)}
                </p>
                <PercentDelta
                  pct={report.changes.salesCountPct}
                  prevFormatted={formatNumber(report.previousSummary.salesCount)}
                />
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <p className="text-xs font-medium text-slate-500">Items Sold</p>
                <p
                  data-testid="report-items-sold"
                  className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-slate-950"
                >
                  {formatNumber(report.summary.itemsSold)}
                </p>
                <PercentDelta
                  pct={report.changes.itemsSoldPct}
                  prevFormatted={formatNumber(report.previousSummary.itemsSold)}
                />
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <p className="text-xs font-medium text-slate-500">Total Discount Given</p>
                <p
                  data-testid="report-discount-given"
                  className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-slate-950"
                >
                  {formatCurrency(report.summary.totalDiscountGiven, currency)}
                </p>
                <PercentDelta
                  pct={report.changes.totalDiscountGivenPct}
                  prevFormatted={formatCurrency(
                    report.previousSummary.totalDiscountGiven,
                    currency
                  )}
                />
              </div>
            </section>

            {/* Sales Per Day Chart + Stock Valuation Snapshot */}
            <section className="grid grid-cols-12 gap-4 items-stretch">
              <div className="col-span-8">
                <SalesPerDayChart
                  series={report.dailySeries}
                  periodType={periodType}
                  currency={currency}
                />
              </div>

              <div
                data-testid="report-stock-valuation"
                className="col-span-4 bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between print-break-avoid"
              >
                <div>
                  <h2 className="text-sm font-bold text-slate-950">Current Stock Value</h2>
                  <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                    Across {formatNumber(report.stockValuation.activeProductCount)} active toys ·{' '}
                    {formatNumber(report.stockValuation.totalUnits)} units on hand
                  </p>
                </div>

                <div className="my-4 divide-y divide-slate-200">
                  <div className="py-3 first:pt-0">
                    <p className="text-xs font-medium text-slate-500">Value at Cost</p>
                    <p className="mt-1 text-xl font-bold font-mono tabular-nums text-slate-950">
                      {formatCurrency(report.stockValuation.totalCostValue, currency)}
                    </p>
                  </div>

                  <div className="py-3">
                    <p className="text-xs font-medium text-slate-500">Value at Selling Price</p>
                    <p className="mt-1 text-xl font-bold font-mono tabular-nums text-slate-950">
                      {formatCurrency(report.stockValuation.totalSellingValue, currency)}
                    </p>
                  </div>

                  <div className="pt-3">
                    <p className="text-xs font-medium text-slate-500">Potential Retail Margin</p>
                    <p className="mt-1 text-base font-bold font-mono tabular-nums text-emerald-700">
                      {formatCurrency(report.stockValuation.potentialProfit, currency)}
                    </p>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400">
                  Archived products and negative oversold units are excluded from valuation.
                </p>
              </div>
            </section>

            {/* Top 10 Best-Selling Products & Current Low-Stock List */}
            <section className="grid grid-cols-2 gap-4 items-start">
              {/* Top 10 Best-Selling */}
              <div
                data-testid="report-top-products"
                className="bg-white border border-slate-200 rounded-xl overflow-hidden print-break-avoid"
              >
                <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-slate-500" aria-hidden="true" />
                    <h2 className="text-sm font-bold text-slate-950">
                      Top 10 Best-Selling Products
                    </h2>
                  </div>
                  <span className="text-xs text-slate-500 tabular-nums">
                    {report.topProducts.length} shown
                  </span>
                </div>

                {report.topProducts.length === 0 ? (
                  <div className="px-5 py-10 text-center text-xs text-slate-500">
                    No completed sales in this period.
                  </div>
                ) : (
                  <table className="w-full border-collapse text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                      <tr>
                        <th scope="col" className="py-2 pl-5 pr-2 w-10">
                          #
                        </th>
                        <th scope="col" className="py-2 px-2">
                          Product
                        </th>
                        <th scope="col" className="py-2 px-2 text-right w-16">
                          Qty
                        </th>
                        <th scope="col" className="py-2 pl-2 pr-5 text-right w-32">
                          Revenue
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-xs">
                      {report.topProducts.map((item, idx) => (
                        <tr key={item.productId} className="hover:bg-slate-50/70">
                          <td className="py-2.5 pl-5 pr-2 font-mono text-slate-400 tabular-nums">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-2 font-semibold text-slate-900">
                            {item.productName}
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono font-semibold text-slate-800 tabular-nums">
                            {formatNumber(item.quantity)}
                          </td>
                          <td className="py-2.5 pl-2 pr-5 text-right font-mono font-semibold text-slate-950 tabular-nums whitespace-nowrap">
                            {formatCurrency(item.revenue, currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Current Low-Stock List */}
              <div
                data-testid="report-low-stock"
                className="bg-white border border-slate-200 rounded-xl overflow-hidden print-break-avoid"
              >
                <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" aria-hidden="true" />
                    <h2 className="text-sm font-bold text-slate-950">Current Low-Stock List</h2>
                  </div>
                  <span className="text-xs text-slate-500 tabular-nums">
                    {formatNumber(report.lowStockProducts.length)} item
                    {report.lowStockProducts.length === 1 ? '' : 's'}
                  </span>
                </div>

                {report.lowStockProducts.length === 0 ? (
                  <div className="px-5 py-10 text-center text-xs text-slate-500">
                    All active products are above their reorder levels.
                  </div>
                ) : (
                  <table className="w-full border-collapse text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                      <tr>
                        <th scope="col" className="py-2 pl-5 pr-2">
                          Product
                        </th>
                        <th scope="col" className="py-2 px-2 text-right w-20">
                          Stock
                        </th>
                        <th scope="col" className="py-2 px-2 text-right w-20">
                          Reorder
                        </th>
                        <th scope="col" className="py-2 pl-2 pr-5 text-right w-28">
                          Cost Value
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-xs">
                      {report.lowStockProducts.map((item) => (
                        <tr key={item.productId} className="hover:bg-slate-50/70">
                          <td className="py-2.5 pl-5 pr-2">
                            <p className="font-semibold text-slate-900">{item.name}</p>
                            {item.variantLabel || item.category ? (
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                {[item.category, item.variantLabel].filter(Boolean).join(' · ')}
                              </p>
                            ) : null}
                          </td>
                          <td
                            className={`py-2.5 px-2 text-right font-mono font-bold tabular-nums ${
                              item.quantityInStock <= 0 ? 'text-red-700' : 'text-amber-700'
                            }`}
                          >
                            {formatNumber(item.quantityInStock)}
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono text-slate-500 tabular-nums">
                            {formatNumber(item.reorderLevel)}
                          </td>
                          <td className="py-2.5 pl-2 pr-5 text-right font-mono text-slate-800 tabular-nums whitespace-nowrap">
                            {formatCurrency(item.costValue, currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </section>

            {/* Unsold In-Stock Products & Sales With Notes */}
            <section className="grid grid-cols-2 gap-4 items-start">
              {/* Products with Stock but No Sales in Period */}
              <div
                data-testid="report-unsold-products"
                className="bg-white border border-slate-200 rounded-xl overflow-hidden print-break-avoid"
              >
                <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-slate-500" aria-hidden="true" />
                    <h2 className="text-sm font-bold text-slate-950">
                      In Stock With No Sales in Period
                    </h2>
                  </div>
                  <span className="text-xs text-slate-500 tabular-nums">
                    {formatNumber(report.unsoldInStockProducts.length)} item
                    {report.unsoldInStockProducts.length === 1 ? '' : 's'}
                  </span>
                </div>

                {report.unsoldInStockProducts.length === 0 ? (
                  <div className="px-5 py-10 text-center text-xs text-slate-500">
                    Every in-stock product recorded at least one sale in this period.
                  </div>
                ) : (
                  <table className="w-full border-collapse text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                      <tr>
                        <th scope="col" className="py-2 pl-5 pr-2">
                          Product
                        </th>
                        <th scope="col" className="py-2 px-2 text-right w-16">
                          Stock
                        </th>
                        <th scope="col" className="py-2 px-2 text-right w-28">
                          At Cost
                        </th>
                        <th scope="col" className="py-2 pl-2 pr-5 text-right w-28">
                          At Selling
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-xs">
                      {report.unsoldInStockProducts.map((item) => (
                        <tr key={item.productId} className="hover:bg-slate-50/70">
                          <td className="py-2.5 pl-5 pr-2">
                            <p className="font-semibold text-slate-900">{item.name}</p>
                            {item.category || item.variantLabel ? (
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                {[item.category, item.variantLabel].filter(Boolean).join(' · ')}
                              </p>
                            ) : null}
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono font-semibold text-slate-800 tabular-nums">
                            {formatNumber(item.quantityInStock)}
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono text-slate-700 tabular-nums whitespace-nowrap">
                            {formatCurrency(item.costValue, currency)}
                          </td>
                          <td className="py-2.5 pl-2 pr-5 text-right font-mono font-semibold text-slate-950 tabular-nums whitespace-nowrap">
                            {formatCurrency(item.sellingValue, currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Sales With Notes in Period */}
              <div
                data-testid="report-noted-sales"
                className="bg-white border border-slate-200 rounded-xl overflow-hidden print-break-avoid"
              >
                <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-amber-700" aria-hidden="true" />
                    <h2 className="text-sm font-bold text-slate-950">
                      Sales With Notes in Period
                    </h2>
                  </div>
                  <span className="text-xs text-slate-500 tabular-nums">
                    {formatNumber(report.notedSales.length)} sale
                    {report.notedSales.length === 1 ? '' : 's'}
                  </span>
                </div>

                {report.notedSales.length === 0 ? (
                  <div className="px-5 py-10 text-center text-xs text-slate-500">
                    No noted sales recorded in this period.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-200">
                    {report.notedSales.map((sale) => {
                      const itemsSummary = sale.items
                        .map((i) => `${i.quantity}× ${i.productName}`)
                        .join(', ');
                      return (
                        <button
                          key={sale.id}
                          type="button"
                          onClick={() => setSelectedSaleId(sale.id)}
                          className="w-full px-5 py-3 text-left hover:bg-amber-50/50 transition-colors flex items-start justify-between gap-4"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-amber-950 break-words">
                              {sale.note}
                            </p>
                            <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                              <span className="font-mono tabular-nums">
                                {formatSaleDateTime(sale.createdAt)}
                              </span>{' '}
                              · {itemsSummary}
                            </p>
                          </div>
                          <span className="text-xs font-mono font-bold tabular-nums text-slate-950 whitespace-nowrap shrink-0">
                            {formatCurrency(sale.totalAmount, currency)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>

            {/* Full Store Backup Exports (hidden in printed reports) */}
            <section
              aria-label="Full store backup exports"
              className="print-hidden bg-white border border-slate-200 rounded-xl p-5 flex items-center justify-between gap-6 flex-wrap"
            >
              <div>
                <h2 className="text-sm font-bold text-slate-950">Full Store Backup (CSV)</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Export complete catalog, sales history, and stock movement records for offline backup.
                </p>
              </div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <button
                  type="button"
                  onClick={() =>
                    downloadCsvFile(
                      getBackupFilename(shopName, 'products'),
                      buildProductsBackupCsv(products, currency)
                    )
                  }
                  className="h-9 px-3.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors inline-flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                  Products CSV ({formatNumber(products.length)})
                </button>
                <button
                  type="button"
                  onClick={() =>
                    downloadCsvFile(
                      getBackupFilename(shopName, 'sales'),
                      buildSalesBackupCsv(sales, currency)
                    )
                  }
                  className="h-9 px-3.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors inline-flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                  Sales CSV ({formatNumber(sales.length)})
                </button>
                <button
                  type="button"
                  onClick={() =>
                    downloadCsvFile(
                      getBackupFilename(shopName, 'stock-movements'),
                      buildStockMovementsBackupCsv(movements, currency)
                    )
                  }
                  className="h-9 px-3.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors inline-flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                  Stock Movements CSV ({formatNumber(movements.length)})
                </button>
              </div>
            </section>
          </div>
        )}
      </div>

      {selectedSale && (
        <SaleDetailsModal
          sale={selectedSale}
          currency={currency}
          onPrintReceipt={(sale) => setReceiptSale(sale)}
          onVoidSale={onVoidSale}
          onClose={() => setSelectedSaleId(null)}
        />
      )}

      {receiptSale && (
        <ReceiptModal
          sale={receiptSale}
          shopName={shopName}
          currency={currency}
          onClose={() => setReceiptSale(null)}
        />
      )}
    </div>
  );
}
