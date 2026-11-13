import { useState } from 'react';
import { formatCurrency, formatNumber } from '../utils/formatters';
import type { DailySalesPoint, ReportPeriodType } from '../utils/reports';

interface SalesPerDayChartProps {
  series: DailySalesPoint[];
  periodType: ReportPeriodType;
  currency: string;
}

function computeNiceAxisMax(rawMax: number): number {
  if (rawMax <= 0) return 10000;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawMax)));
  const normalized = rawMax / magnitude;
  let step = 10;
  if (normalized <= 1.2) step = 1.2;
  else if (normalized <= 1.5) step = 1.5;
  else if (normalized <= 2) step = 2;
  else if (normalized <= 2.5) step = 2.5;
  else if (normalized <= 3) step = 3;
  else if (normalized <= 4) step = 4;
  else if (normalized <= 5) step = 5;
  else if (normalized <= 6) step = 6;
  else if (normalized <= 8) step = 8;
  return Math.ceil(step * magnitude);
}

export function SalesPerDayChart({
  series,
  periodType,
  currency,
}: SalesPerDayChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const rawMax = series.reduce((max, d) => Math.max(max, d.totalSales), 0);
  const axisMax = computeNiceAxisMax(rawMax);
  const activeDaysCount = series.filter((d) => d.totalSales > 0).length;
  const peakDay = series.reduce<DailySalesPoint | null>(
    (best, d) => (!best || d.totalSales > best.totalSales ? d : best),
    null
  );

  const hovered = activeIndex !== null ? series[activeIndex] ?? null : null;

  // SVG coordinate box
  const svgWidth = 680;
  const svgHeight = 220;
  const padLeft = 64;
  const padRight = 14;
  const padTop = 14;
  const padBottom = 30;
  const plotW = svgWidth - padLeft - padRight;
  const plotH = svgHeight - padTop - padBottom;

  const slotW = series.length > 0 ? plotW / series.length : plotW;
  const barW =
    periodType === 'weekly'
      ? Math.min(44, Math.max(20, slotW * 0.56))
      : Math.min(16, Math.max(6, slotW * 0.66));

  const yTicks = [0, 0.5, 1];

  return (
    <div
      data-testid="sales-per-day-chart"
      className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between h-full print-break-avoid"
    >
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <h2 className="text-sm font-bold text-slate-950">Sales per Day</h2>
          <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
            {activeDaysCount} active selling day{activeDaysCount === 1 ? '' : 's'} in this period
          </p>
        </div>

        <div className="text-right min-h-[34px]">
          {hovered ? (
            <div className="text-xs tabular-nums">
              <p className="font-semibold text-slate-950">{hovered.fullDateLabel}</p>
              <p className="text-slate-600 font-mono mt-0.5">
                {formatCurrency(hovered.totalSales, currency)} · Profit{' '}
                {formatCurrency(hovered.grossProfit, currency)} · {formatNumber(hovered.salesCount)}{' '}
                sale{hovered.salesCount === 1 ? '' : 's'}
              </p>
            </div>
          ) : peakDay && peakDay.totalSales > 0 ? (
            <div className="text-xs tabular-nums">
              <p className="text-slate-500">Peak day: {peakDay.fullDateLabel}</p>
              <p className="font-mono font-semibold text-slate-950 mt-0.5">
                {formatCurrency(peakDay.totalSales, currency)} ({formatNumber(peakDay.salesCount)}{' '}
                sale{peakDay.salesCount === 1 ? '' : 's'})
              </p>
            </div>
          ) : (
            <p className="text-xs text-slate-400">No sales recorded in period</p>
          )}
        </div>
      </div>

      <div className="w-full">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          role="img"
          aria-label={`Bar chart of daily sales for the selected ${periodType} period`}
          className="w-full h-auto overflow-visible select-none"
        >
          {/* Y-axis gridlines and tick labels */}
          {yTicks.map((ratio) => {
            const y = padTop + plotH * (1 - ratio);
            const value = Math.round(axisMax * ratio);
            return (
              <g key={ratio}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={svgWidth - padRight}
                  y2={y}
                  stroke={ratio === 0 ? '#cbd5e1' : '#e2e8f0'}
                  strokeWidth={1}
                  strokeDasharray={ratio === 0 ? undefined : '3 3'}
                />
                <text
                  x={padLeft - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-slate-500 text-[10px]"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  {formatNumber(value)}
                </text>
              </g>
            );
          })}

          {/* Bars + X-axis labels */}
          {series.map((point, idx) => {
            const centerX = padLeft + slotW * idx + slotW / 2;
            const barX = centerX - barW / 2;
            const ratio = axisMax > 0 ? Math.min(1, point.totalSales / axisMax) : 0;
            const barH = point.totalSales > 0 ? Math.max(4, ratio * plotH) : 2;
            const barY = padTop + plotH - barH;
            const isActive = activeIndex === idx;

            const showMonthlyTick =
              periodType === 'weekly' ||
              idx === 0 ||
              idx === series.length - 1 ||
              Number(point.axisLabel) % 5 === 0;

            return (
              <g
                key={point.dateYmd}
                tabIndex={0}
                role="button"
                aria-label={`${point.fullDateLabel}: ${formatCurrency(point.totalSales, currency)}, ${point.salesCount} sales`}
                onMouseEnter={() => setActiveIndex(idx)}
                onMouseLeave={() => setActiveIndex(null)}
                onFocus={() => setActiveIndex(idx)}
                onBlur={() => setActiveIndex(null)}
                className="cursor-pointer focus:outline-none"
              >
                {/* Invisible wider hit column for easy hover */}
                <rect
                  x={padLeft + slotW * idx}
                  y={padTop}
                  width={slotW}
                  height={plotH + padBottom}
                  fill="transparent"
                />

                <rect
                  x={barX}
                  y={barY}
                  width={barW}
                  height={barH}
                  rx={point.totalSales > 0 ? 3 : 1}
                  fill={
                    point.totalSales === 0
                      ? '#e2e8f0'
                      : isActive
                        ? '#1d4ed8'
                        : '#0f172a'
                  }
                />

                {showMonthlyTick && (
                  <text
                    x={centerX}
                    y={padTop + plotH + 17}
                    textAnchor="middle"
                    className={isActive ? 'fill-slate-950 font-semibold text-[10px]' : 'fill-slate-500 text-[10px]'}
                    style={{ fontFamily: 'var(--font-sans)' }}
                  >
                    {point.axisLabel}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
