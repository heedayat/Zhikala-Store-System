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
import { useTranslation } from '../contexts/I18nContext';
import type { Product, Sale, StockMovement } from '../types/inventory';
import {
  buildProductsBackupCsv,
  buildSalesBackupCsv,
  buildStockMovementsBackupCsv,
  downloadCsvFile,
  getBackupFilename,
} from '../utils/backupCsv';
import { formatActionError, formatNumber } from '../utils/formatters';
import { interpolate } from '../utils/i18n';
import {
  buildPeriodReport,
  buildReportCsv,
  normalizeWeekStartDay,
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
  storeSubtitle?: string;
  receiptFooter?: string;
  logoUrl?: string;
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
  const { t } = useTranslation();

  if (pct === null) {
    return (
      <p className="mt-1.5 text-xs text-slate-500 tabular-nums">
        {t.reports.vsPrev}{' '}
        <span dir="ltr" className="ltr-isolate font-mono">
          {prevFormatted}
        </span>
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
      <span
        dir="ltr"
        className={`ltr-isolate inline-flex items-center gap-0.5 font-semibold font-mono ${toneClass}`}
      >
        {isUp ? (
          <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
        ) : isDown ? (
          <ArrowDownRight className="w-3.5 h-3.5" aria-hidden="true" />
        ) : null}
        {pct > 0 ? `+${pct}%` : `${pct}%`}
      </span>
      <span className="text-slate-500">
        {t.reports.vs}{' '}
        <span dir="ltr" className="ltr-isolate font-mono">
          {prevFormatted}
        </span>
      </span>
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
  storeSubtitle,
  receiptFooter,
  logoUrl,
  currency,
  weekStartDay,
  onChangeWeekStartDay,
  onVoidSale,
}: ReportsViewProps) {
  const { lang, t, formatCurrencyLocalized, weekdayLabel, weekdayOptions } = useTranslation();
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
        lang,
      }),
    [sales, products, periodType, periodOffset, safeWeekStartDay, lang]
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
    <div className="flex-1 flex flex-col min-w-0 md:h-screen md:overflow-hidden bg-white">
      {/* Top Header & Period Controls (hidden when printing report) */}
      <header className="print-hidden px-4 md:px-6 py-3.5 border-b border-slate-200 flex items-center justify-between gap-3 flex-wrap bg-white shrink-0">
        <div className="flex items-center gap-3 md:gap-4 flex-wrap">
          <h1 className="text-lg font-bold text-slate-950 tracking-tight whitespace-nowrap">
            {t.reports.title}
          </h1>

          {/* Weekly / Monthly tabs */}
          <div
            role="tablist"
            aria-label={t.reports.periodTypeAria}
            className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg"
          >
            <button
              type="button"
              role="tab"
              aria-selected={periodType === 'weekly'}
              onClick={() => handlePeriodTypeChange('weekly')}
              className={`min-h-[34px] px-3.5 rounded-md text-xs font-semibold transition-all duration-200 ease-out active:scale-[0.98] whitespace-nowrap ${
                periodType === 'weekly'
                  ? 'bg-white text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.reports.weekly}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={periodType === 'monthly'}
              onClick={() => handlePeriodTypeChange('monthly')}
              className={`min-h-[34px] px-3.5 rounded-md text-xs font-semibold transition-all duration-200 ease-out active:scale-[0.98] whitespace-nowrap ${
                periodType === 'monthly'
                  ? 'bg-white text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.reports.monthly}
            </button>
          </div>

          {/* Previous / Current / Next Period Navigation */}
          <div className="inline-flex items-center gap-1 border border-slate-300 rounded-lg bg-white p-0.5">
            <button
              type="button"
              onClick={() => setPeriodOffset((prev) => prev - 1)}
              aria-label={periodType === 'weekly' ? t.reports.previousWeek : t.reports.previousMonth}
              className="w-9 h-9 md:w-8 md:h-8 rounded-md text-slate-600 hover:text-slate-950 hover:bg-slate-100 flex items-center justify-center transition-colors"
            >
              <ChevronLeft className="w-4 h-4 rtl:rotate-180" aria-hidden="true" />
            </button>
            <span
              data-testid="report-period-label"
              className="px-2 text-xs font-semibold text-slate-950 tabular-nums whitespace-nowrap min-w-[132px] sm:min-w-[148px] text-center"
            >
              {report.period.label}
            </span>
            <button
              type="button"
              disabled={periodOffset >= 0}
              onClick={() => setPeriodOffset((prev) => Math.min(0, prev + 1))}
              aria-label={periodType === 'weekly' ? t.reports.nextWeek : t.reports.nextMonth}
              className="w-9 h-9 md:w-8 md:h-8 rounded-md text-slate-600 hover:text-slate-950 hover:bg-slate-100 disabled:opacity-35 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
            >
              <ChevronRight className="w-4 h-4 rtl:rotate-180" aria-hidden="true" />
            </button>
          </div>

          {periodOffset < 0 && (
            <button
              type="button"
              onClick={() => setPeriodOffset(0)}
              className="min-h-[36px] px-3 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition-all duration-200 ease-out active:scale-[0.98] whitespace-nowrap"
            >
              {periodType === 'weekly' ? t.reports.thisWeek : t.reports.thisMonth}
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
                {t.reports.weekStarts}
              </label>
              <select
                id="reports-week-start-select"
                aria-label={t.reports.weekStartsAria}
                disabled={isUpdatingWeekDay}
                value={safeWeekStartDay}
                onChange={(e) => void handleWeekStartChange(Number(e.target.value))}
                className="min-h-[38px] px-2.5 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-600"
              >
                {weekdayOptions.map((opt) => (
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
            className="min-h-[38px] px-3.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-all duration-200 ease-out active:scale-[0.98] inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            {t.reports.exportCsv}
          </button>

          <button
            type="button"
            onClick={handlePrintReport}
            className="min-h-[38px] px-4 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-all duration-200 ease-out active:scale-[0.98] inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <Printer className="w-3.5 h-3.5" aria-hidden="true" />
            {t.reports.printReport}
          </button>
        </div>
      </header>

      {/* Scrollable Report Body */}
      <div
        id="reports-scroll-container"
        className="flex-1 md:overflow-y-auto bg-slate-50/50 pb-24 md:pb-6"
      >
        {loadError && (
          <div className="m-4 md:m-6 p-4 rounded-lg border border-red-200 bg-red-50 text-sm text-red-800">
            {t.reports.loadError} {formatActionError(loadError, t.auth.verifyErrorFallback)}
          </div>
        )}

        {isLoading ? (
          <div className="p-4 md:p-6 space-y-5" aria-label={t.reports.loadingAria}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
          <div id="printable-report" className="p-4 md:p-6 space-y-5 max-w-[1440px]">
            {/* Print-Only Report Header */}
            <div className="print-only pb-4 border-b border-slate-300 mb-4">
              <div className="flex items-baseline justify-between gap-4">
                <div>
                  <h1 className="text-xl font-bold text-slate-950">
                    {shopName} —{' '}
                    {periodType === 'weekly'
                      ? t.reports.weeklyReportSuffix
                      : t.reports.monthlyReportSuffix}
                  </h1>
                  <p className="text-sm text-slate-700 mt-0.5">
                    {t.reports.periodPrefix} {report.period.label}
                    {periodType === 'weekly'
                      ? ` · ${t.reports.weekStartingPrefix} ${weekdayLabel(safeWeekStartDay)}`
                      : ''}
                    {' · '}
                    {t.reports.comparedAgainstPrefix} {report.period.prevLabel}
                  </p>
                </div>
                <p className="text-xs text-slate-500 font-mono">
                  {t.reports.printedPrefix}{' '}
                  <span dir="ltr" className="ltr-isolate">
                    {formatSaleDateTime(new Date(), lang)}
                  </span>
                </p>
              </div>
            </div>

            {/* Period Comparison Context Line */}
            <div className="flex items-center justify-between gap-3 flex-wrap text-xs text-slate-500">
              <span>
                {t.reports.completedSalesContext}{' '}
                <span className="font-medium text-slate-700">{report.period.prevLabel}</span>
              </span>
              {periodType === 'weekly' && (
                <span className="whitespace-nowrap">
                  {t.reports.weekStartsOn}{' '}
                  <span className="font-medium text-slate-700">
                    {weekdayLabel(safeWeekStartDay)}
                  </span>
                </span>
              )}
            </div>

            {/* 6 Core Period KPIs */}
            <section
              aria-label={t.reports.metricsAria}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 print-break-avoid"
            >
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <p className="text-xs font-medium text-slate-500">{t.reports.totalSales}</p>
                <p
                  data-testid="report-total-sales"
                  className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-slate-950"
                >
                  <span dir="ltr" className="ltr-isolate">
                    {formatCurrencyLocalized(report.summary.totalSales, currency)}
                  </span>
                </p>
                <PercentDelta
                  pct={report.changes.totalSalesPct}
                  prevFormatted={formatCurrencyLocalized(report.previousSummary.totalSales, currency)}
                />
                <div className="mt-3 pt-2.5 border-t border-slate-100 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="block text-[11px] text-slate-500">
                      {t.reports.cashSalesCount} (
                      <span dir="ltr" className="ltr-isolate font-mono">
                        {formatNumber(report.summary.cashSalesCount)}
                      </span>
                      )
                    </span>
                    <span
                      data-testid="report-cash-sales"
                      dir="ltr"
                      className="ltr-isolate font-mono font-semibold tabular-nums text-slate-900"
                    >
                      {formatCurrencyLocalized(report.summary.cashSalesTotal, currency)}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[11px] text-slate-500">
                      {t.reports.fibDigitalCount} (
                      <span dir="ltr" className="ltr-isolate font-mono">
                        {formatNumber(report.summary.digitalSalesCount)}
                      </span>
                      )
                    </span>
                    <span
                      data-testid="report-digital-sales"
                      dir="ltr"
                      className="ltr-isolate font-mono font-semibold tabular-nums text-blue-700"
                    >
                      {formatCurrencyLocalized(report.summary.digitalSalesTotal, currency)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-slate-500">{t.reports.grossProfit}</p>
                  {report.summary.totalSales > 0 && (
                    <span className="text-[11px] text-slate-500 tabular-nums">
                      <span dir="ltr" className="ltr-isolate font-mono">
                        {grossMarginPct}%
                      </span>{' '}
                      {t.reports.marginSuffix}
                    </span>
                  )}
                </div>
                <p
                  data-testid="report-gross-profit"
                  className={`mt-1.5 text-2xl font-bold font-mono tabular-nums ${
                    report.summary.grossProfit < 0 ? 'text-red-700' : 'text-emerald-700'
                  }`}
                >
                  <span dir="ltr" className="ltr-isolate">
                    {formatCurrencyLocalized(report.summary.grossProfit, currency)}
                  </span>
                </p>
                <PercentDelta
                  pct={report.changes.grossProfitPct}
                  prevFormatted={formatCurrencyLocalized(report.previousSummary.grossProfit, currency)}
                />
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <p className="text-xs font-medium text-slate-500">{t.reports.averageSaleValue}</p>
                <p
                  data-testid="report-avg-sale"
                  className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-slate-950"
                >
                  <span dir="ltr" className="ltr-isolate">
                    {formatCurrencyLocalized(report.summary.averageSaleValue, currency)}
                  </span>
                </p>
                <PercentDelta
                  pct={report.changes.averageSaleValuePct}
                  prevFormatted={formatCurrencyLocalized(
                    report.previousSummary.averageSaleValue,
                    currency
                  )}
                />
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <p className="text-xs font-medium text-slate-500">{t.reports.numberOfSales}</p>
                <p
                  data-testid="report-sales-count"
                  className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-slate-950"
                >
                  <span dir="ltr" className="ltr-isolate">
                    {formatNumber(report.summary.salesCount)}
                  </span>
                </p>
                <PercentDelta
                  pct={report.changes.salesCountPct}
                  prevFormatted={formatNumber(report.previousSummary.salesCount)}
                />
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <p className="text-xs font-medium text-slate-500">{t.reports.itemsSold}</p>
                <p
                  data-testid="report-items-sold"
                  className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-slate-950"
                >
                  <span dir="ltr" className="ltr-isolate">
                    {formatNumber(report.summary.itemsSold)}
                  </span>
                </p>
                <PercentDelta
                  pct={report.changes.itemsSoldPct}
                  prevFormatted={formatNumber(report.previousSummary.itemsSold)}
                />
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <p className="text-xs font-medium text-slate-500">{t.reports.totalDiscountGiven}</p>
                <p
                  data-testid="report-discount-given"
                  className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-slate-950"
                >
                  <span dir="ltr" className="ltr-isolate">
                    {formatCurrencyLocalized(report.summary.totalDiscountGiven, currency)}
                  </span>
                </p>
                <PercentDelta
                  pct={report.changes.totalDiscountGivenPct}
                  prevFormatted={formatCurrencyLocalized(
                    report.previousSummary.totalDiscountGiven,
                    currency
                  )}
                />
              </div>
            </section>

            {/* Sales Per Day Chart + Stock Valuation Snapshot */}
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
              <div className="lg:col-span-8 min-w-0">
                <SalesPerDayChart
                  series={report.dailySeries}
                  periodType={periodType}
                  currency={currency}
                />
              </div>

              <div
                data-testid="report-stock-valuation"
                className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between print-break-avoid"
              >
                <div>
                  <h2 className="text-sm font-bold text-slate-950">{t.reports.currentStockValue}</h2>
                  <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                    {interpolate(t.reports.activeToysUnits, {
                      products: formatNumber(report.stockValuation.activeProductCount),
                      units: formatNumber(report.stockValuation.totalUnits),
                    })}
                  </p>
                </div>

                <div className="my-4 divide-y divide-slate-100">
                  <div className="py-3 first:pt-0">
                    <p className="text-xs font-medium text-slate-500">{t.reports.valueAtCost}</p>
                    <p className="mt-1 text-xl font-bold font-mono tabular-nums text-slate-950">
                      <span dir="ltr" className="ltr-isolate">
                        {formatCurrencyLocalized(report.stockValuation.totalCostValue, currency)}
                      </span>
                    </p>
                  </div>

                  <div className="py-3">
                    <p className="text-xs font-medium text-slate-500">
                      {t.reports.valueAtSellingPrice}
                    </p>
                    <p className="mt-1 text-xl font-bold font-mono tabular-nums text-slate-950">
                      <span dir="ltr" className="ltr-isolate">
                        {formatCurrencyLocalized(report.stockValuation.totalSellingValue, currency)}
                      </span>
                    </p>
                  </div>

                  <div className="pt-3">
                    <p className="text-xs font-medium text-slate-500">
                      {t.reports.potentialRetailMargin}
                    </p>
                    <p className="mt-1 text-base font-bold font-mono tabular-nums text-emerald-700">
                      <span dir="ltr" className="ltr-isolate">
                        {formatCurrencyLocalized(report.stockValuation.potentialProfit, currency)}
                      </span>
                    </p>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400">{t.reports.valuationNote}</p>
              </div>
            </section>

            {/* Top 10 Best-Selling Products & Current Low-Stock List */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
              {/* Top 10 Best-Selling */}
              <div
                data-testid="report-top-products"
                className="bg-white border border-slate-200 rounded-xl overflow-hidden print-break-avoid"
              >
                <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-slate-500" aria-hidden="true" />
                    <h2 className="text-sm font-bold text-slate-950">{t.reports.top10Title}</h2>
                  </div>
                  <span className="text-xs text-slate-500 tabular-nums shrink-0">
                    {interpolate(t.reports.shownCount, {
                      count: formatNumber(report.topProducts.length),
                    })}
                  </span>
                </div>

                {report.topProducts.length === 0 ? (
                  <div className="px-5 py-10 text-center text-xs text-slate-500">
                    {t.reports.noCompletedSales}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-start">
                      <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                        <tr>
                          <th scope="col" className="py-2 ps-5 pe-2 w-10">
                            {t.reports.colRank}
                          </th>
                          <th scope="col" className="py-2 px-2">
                            {t.reports.colProduct}
                          </th>
                          <th scope="col" className="py-2 px-2 text-end w-16">
                            {t.reports.colQty}
                          </th>
                          <th scope="col" className="py-2 ps-2 pe-5 text-end w-32">
                            {t.reports.colRevenue}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {report.topProducts.map((item, idx) => (
                          <tr key={item.productId} className="hover:bg-slate-50/70">
                            <td className="py-2.5 ps-5 pe-2 font-mono text-slate-400 tabular-nums">
                              <span dir="ltr" className="ltr-isolate">
                                {idx + 1}
                              </span>
                            </td>
                            <td className="py-2.5 px-2 font-semibold text-slate-900">
                              {item.productName}
                            </td>
                            <td className="py-2.5 px-2 text-end font-mono font-semibold text-slate-800 tabular-nums">
                              <span dir="ltr" className="ltr-isolate">
                                {formatNumber(item.quantity)}
                              </span>
                            </td>
                            <td className="py-2.5 ps-2 pe-5 text-end font-mono font-semibold text-slate-950 tabular-nums whitespace-nowrap">
                              <span dir="ltr" className="ltr-isolate">
                                {formatCurrencyLocalized(item.revenue, currency)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
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
                    <h2 className="text-sm font-bold text-slate-950">{t.reports.lowStockTitle}</h2>
                  </div>
                  <span className="text-xs text-slate-500 tabular-nums">
                    {formatNumber(report.lowStockProducts.length)}{' '}
                    {report.lowStockProducts.length === 1 ? t.common.item : t.common.items}
                  </span>
                </div>

                {report.lowStockProducts.length === 0 ? (
                  <div className="px-5 py-10 text-center text-xs text-slate-500">
                    {t.reports.allAboveReorder}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-start">
                      <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                        <tr>
                          <th scope="col" className="py-2 ps-5 pe-2">
                            {t.reports.colProduct}
                          </th>
                          <th scope="col" className="py-2 px-2 text-end w-20">
                            {t.reports.colStock}
                          </th>
                          <th scope="col" className="py-2 px-2 text-end w-20">
                            {t.reports.colReorder}
                          </th>
                          <th scope="col" className="py-2 ps-2 pe-5 text-end w-28">
                            {t.reports.colCostValue}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {report.lowStockProducts.map((item) => (
                          <tr key={item.productId} className="hover:bg-slate-50/70">
                            <td className="py-2.5 ps-5 pe-2">
                              <p className="font-semibold text-slate-900">{item.name}</p>
                              {item.variantLabel || item.category ? (
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                  {[item.category, item.variantLabel].filter(Boolean).join(' · ')}
                                </p>
                              ) : null}
                            </td>
                            <td
                              className={`py-2.5 px-2 text-end font-mono font-bold tabular-nums ${
                                item.quantityInStock <= 0 ? 'text-red-700' : 'text-amber-700'
                              }`}
                            >
                              <span dir="ltr" className="ltr-isolate">
                                {formatNumber(item.quantityInStock)}
                              </span>
                            </td>
                            <td className="py-2.5 px-2 text-end font-mono text-slate-500 tabular-nums">
                              <span dir="ltr" className="ltr-isolate">
                                {formatNumber(item.reorderLevel)}
                              </span>
                            </td>
                            <td className="py-2.5 ps-2 pe-5 text-end font-mono text-slate-800 tabular-nums whitespace-nowrap">
                              <span dir="ltr" className="ltr-isolate">
                                {formatCurrencyLocalized(item.costValue, currency)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>

            {/* Unsold In-Stock Products & Sales With Notes */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
              {/* Products with Stock but No Sales in Period */}
              <div
                data-testid="report-unsold-products"
                className="bg-white border border-slate-200 rounded-xl overflow-hidden print-break-avoid"
              >
                <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-slate-500" aria-hidden="true" />
                    <h2 className="text-sm font-bold text-slate-950">{t.reports.unsoldTitle}</h2>
                  </div>
                  <span className="text-xs text-slate-500 tabular-nums shrink-0">
                    {formatNumber(report.unsoldInStockProducts.length)}{' '}
                    {report.unsoldInStockProducts.length === 1 ? t.common.item : t.common.items}
                  </span>
                </div>

                {report.unsoldInStockProducts.length === 0 ? (
                  <div className="px-5 py-10 text-center text-xs text-slate-500">
                    {t.reports.allSoldHint}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-start">
                      <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                        <tr>
                          <th scope="col" className="py-2 ps-5 pe-2">
                            {t.reports.colProduct}
                          </th>
                          <th scope="col" className="py-2 px-2 text-end w-16">
                            {t.reports.colStock}
                          </th>
                          <th scope="col" className="py-2 px-2 text-end w-28">
                            {t.reports.colAtCost}
                          </th>
                          <th scope="col" className="py-2 ps-2 pe-5 text-end w-28">
                            {t.reports.colAtSelling}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {report.unsoldInStockProducts.map((item) => (
                          <tr key={item.productId} className="hover:bg-slate-50/70">
                            <td className="py-2.5 ps-5 pe-2">
                              <p className="font-semibold text-slate-900">{item.name}</p>
                              {item.category || item.variantLabel ? (
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                  {[item.category, item.variantLabel].filter(Boolean).join(' · ')}
                                </p>
                              ) : null}
                            </td>
                            <td className="py-2.5 px-2 text-end font-mono font-semibold text-slate-800 tabular-nums">
                              <span dir="ltr" className="ltr-isolate">
                                {formatNumber(item.quantityInStock)}
                              </span>
                            </td>
                            <td className="py-2.5 px-2 text-end font-mono text-slate-700 tabular-nums whitespace-nowrap">
                              <span dir="ltr" className="ltr-isolate">
                                {formatCurrencyLocalized(item.costValue, currency)}
                              </span>
                            </td>
                            <td className="py-2.5 ps-2 pe-5 text-end font-mono font-semibold text-slate-950 tabular-nums whitespace-nowrap">
                              <span dir="ltr" className="ltr-isolate">
                                {formatCurrencyLocalized(item.sellingValue, currency)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
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
                      {t.reports.notedSalesTitle}
                    </h2>
                  </div>
                  <span className="text-xs text-slate-500 tabular-nums shrink-0">
                    {formatNumber(report.notedSales.length)}{' '}
                    {report.notedSales.length === 1 ? t.common.saleSingular : t.common.salePlural}
                  </span>
                </div>

                {report.notedSales.length === 0 ? (
                  <div className="px-5 py-10 text-center text-xs text-slate-500">
                    {t.reports.noNotedSales}
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {report.notedSales.map((sale) => {
                      const itemsSummary = sale.items
                        .map((i) => `${i.quantity}× ${i.productName}`)
                        .join(', ');
                      return (
                        <button
                          key={sale.id}
                          type="button"
                          onClick={() => setSelectedSaleId(sale.id)}
                          className="w-full px-5 py-3 text-start hover:bg-amber-50/50 transition-colors flex items-start justify-between gap-4"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-amber-950 break-words">
                              {sale.note}
                            </p>
                            <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                              <span dir="ltr" className="ltr-isolate font-mono tabular-nums">
                                {formatSaleDateTime(sale.createdAt, lang)}
                              </span>{' '}
                              · {itemsSummary}
                            </p>
                          </div>
                          <span
                            dir="ltr"
                            className="ltr-isolate text-xs font-mono font-bold tabular-nums text-slate-950 whitespace-nowrap shrink-0"
                          >
                            {formatCurrencyLocalized(sale.totalAmount, currency)}
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
              aria-label={t.reports.backupAria}
              className="print-hidden bg-white border border-slate-200 rounded-xl p-5 flex items-center justify-between gap-4 flex-wrap"
            >
              <div>
                <h2 className="text-sm font-bold text-slate-950">{t.reports.backupTitle}</h2>
                <p className="text-xs text-slate-500 mt-0.5">{t.reports.backupSubtitle}</p>
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
                  className="min-h-[38px] px-3.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-all duration-200 ease-out active:scale-[0.98] inline-flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                  {t.reports.productsCsv} (
                  <span dir="ltr" className="ltr-isolate font-mono">
                    {formatNumber(products.length)}
                  </span>
                  )
                </button>
                <button
                  type="button"
                  onClick={() =>
                    downloadCsvFile(
                      getBackupFilename(shopName, 'sales'),
                      buildSalesBackupCsv(sales, currency)
                    )
                  }
                  className="min-h-[38px] px-3.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-all duration-200 ease-out active:scale-[0.98] inline-flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                  {t.reports.salesCsv} (
                  <span dir="ltr" className="ltr-isolate font-mono">
                    {formatNumber(sales.length)}
                  </span>
                  )
                </button>
                <button
                  type="button"
                  onClick={() =>
                    downloadCsvFile(
                      getBackupFilename(shopName, 'stock-movements'),
                      buildStockMovementsBackupCsv(movements, currency)
                    )
                  }
                  className="min-h-[38px] px-3.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-all duration-200 ease-out active:scale-[0.98] inline-flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                  {t.reports.movementsCsv} (
                  <span dir="ltr" className="ltr-isolate font-mono">
                    {formatNumber(movements.length)}
                  </span>
                  )
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
          storeSubtitle={storeSubtitle}
          receiptFooter={receiptFooter}
          logoUrl={logoUrl}
          currency={currency}
          onClose={() => setReceiptSale(null)}
        />
      )}
    </div>
  );
}
