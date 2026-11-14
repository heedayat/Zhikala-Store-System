import { useEffect, useState } from 'react';
import { AlertTriangle, Ban, CheckCircle2, FileText, Printer, X } from 'lucide-react';
import { useTranslation } from '../contexts/I18nContext';
import type { AppUser, Sale } from '../types/inventory';
import { formatActionError, formatNumber } from '../utils/formatters';
import { interpolate } from '../utils/i18n';
import { formatSaleDateTime, isDigitalPaymentMethod } from '../utils/sales';
import { resolveRecordedByLabel } from '../utils/users';

interface SaleDetailsModalProps {
  sale: Sale;
  users?: AppUser[];
  currency: string;
  hideCostDetails?: boolean;
  onPrintReceipt: (sale: Sale) => void;
  onVoidSale: (saleId: string) => Promise<void>;
  onClose: () => void;
}

export function SaleDetailsModal({
  sale,
  users = [],
  currency,
  hideCostDetails = false,
  onPrintReceipt,
  onVoidSale,
  onClose,
}: SaleDetailsModalProps) {
  const { lang, t, formatCurrencyLocalized, paymentLabel } = useTranslation();
  const [confirmVoid, setConfirmVoid] = useState(false);
  const [isVoiding, setIsVoiding] = useState(false);
  const [voidError, setVoidError] = useState<string | null>(null);

  const isVoided = sale.status === 'voided';
  const shortRef = sale.id.slice(-8).toUpperCase();
  const resolvedPaymentLabel = paymentLabel(sale.paymentMethod);
  const isDigital = isDigitalPaymentMethod(sale.paymentMethod);
  const recordedBy = resolveRecordedByLabel(sale, users);
  const itemsLabel = `${formatNumber(sale.itemCount)} ${
    sale.itemCount === 1 ? t.common.item : t.common.items
  }`;

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !isVoiding) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVoiding, onClose]);

  async function handleConfirmVoid() {
    if (isVoiding || isVoided) return;
    setIsVoiding(true);
    setVoidError(null);
    try {
      await onVoidSale(sale.id);
      setConfirmVoid(false);
    } catch (err) {
      setVoidError(formatActionError(err, 'Failed to void sale.'));
    } finally {
      setIsVoiding(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="sale-details-modal-title"
      className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-xs modal-backdrop-enter flex items-center justify-center p-3 sm:p-6"
    >
      <div className="bg-white border border-slate-200 rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh] modal-panel-enter text-start">
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-slate-200 flex items-start justify-between gap-4 shrink-0">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 id="sale-details-modal-title" className="text-base font-bold text-slate-950">
                {t.saleDetails.titlePrefix}{' '}
                <span dir="ltr" className="ltr-isolate font-mono">
                  #{shortRef}
                </span>
              </h2>
              <span
                data-testid="sale-details-payment-badge"
                className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-semibold ${
                  isDigital
                    ? 'border-blue-200 bg-blue-50 text-blue-800'
                    : 'border-slate-200 bg-slate-100 text-slate-700'
                }`}
              >
                {resolvedPaymentLabel}
              </span>
              {isVoided ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700">
                  <Ban className="w-3.5 h-3.5" aria-hidden="true" />
                  {t.saleDetails.voided}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                  {t.saleDetails.completed}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5 tabular-nums flex flex-wrap items-center gap-1.5">
              <span dir="ltr" className="ltr-isolate">
                {formatSaleDateTime(sale.createdAt, lang)}
              </span>
              <span aria-hidden="true">·</span>
              <span>{resolvedPaymentLabel}</span>
              <span aria-hidden="true">·</span>
              <span dir="ltr" className="ltr-isolate">
                {itemsLabel}
              </span>
              {recordedBy && (
                <>
                  <span aria-hidden="true">·</span>
                  <span dir="auto" data-testid="sale-details-recorded-by">
                    {t.common.recordedByPrefix}{' '}
                    <span className="font-medium text-slate-700">{recordedBy}</span>
                  </span>
                </>
              )}
              {isVoided && sale.voidedAt && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>
                    {t.saleDetails.voidedPrefix}{' '}
                    <span dir="ltr" className="ltr-isolate">
                      {formatSaleDateTime(sale.voidedAt, lang)}
                    </span>
                  </span>
                </>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.saleDetails.closeAria}
            className="w-8 h-8 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center shrink-0"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
          {sale.note ? (
            <div className="p-3.5 rounded-lg border border-amber-200 bg-amber-50/70 flex items-start gap-2.5">
              <FileText className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-amber-950">{t.saleDetails.saleNote}</p>
                <p className="text-sm text-amber-900 mt-0.5 break-words">{sale.note}</p>
              </div>
            </div>
          ) : null}

          {voidError && (
            <div
              role="alert"
              className="p-3 rounded-lg border border-red-200 bg-red-50 text-xs text-red-800"
            >
              {voidError}
            </div>
          )}

          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[540px] border-collapse text-start">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                  <tr>
                    <th scope="col" className="py-2.5 px-4">
                      {t.saleDetails.colItem}
                    </th>
                    <th scope="col" className="py-2.5 px-3 text-end w-16">
                      {t.saleDetails.colQty}
                    </th>
                    <th scope="col" className="py-2.5 px-3 text-end w-28">
                      {t.saleDetails.colListPrice}
                    </th>
                    <th scope="col" className="py-2.5 px-3 text-end w-28">
                      {t.saleDetails.colSoldAt}
                    </th>
                    <th scope="col" className="py-2.5 px-4 text-end w-32">
                      {t.saleDetails.colLineTotal}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {sale.items.map((item, idx) => {
                    const bargained = item.unitPrice !== item.listPrice;
                    const belowCost = item.unitPrice < item.costPrice;
                    return (
                      <tr key={`${item.productId}-${idx}`}>
                        <td className="py-3 px-4 align-top">
                          <p className="font-medium text-slate-950">{item.productName}</p>
                          {!hideCostDetails && (
                            <p className="text-xs text-slate-500 mt-0.5">
                              <span>{t.saleDetails.costPrefix} </span>
                              <span dir="ltr" className="ltr-isolate font-mono tabular-nums">
                                {formatCurrencyLocalized(item.costPrice, currency)}
                              </span>
                              {belowCost ? (
                                <span className="ms-2 font-sans font-semibold text-amber-700">
                                  {t.saleDetails.soldBelowCost}
                                </span>
                              ) : null}
                            </p>
                          )}
                        </td>
                        <td className="py-3 px-3 align-top text-end font-mono tabular-nums text-slate-800">
                          <span dir="ltr" className="ltr-isolate">
                            {formatNumber(item.quantity)}
                          </span>
                        </td>
                        <td className="py-3 px-3 align-top text-end font-mono text-xs tabular-nums text-slate-500">
                          <span dir="ltr" className="ltr-isolate">
                            {formatCurrencyLocalized(item.listPrice, currency)}
                          </span>
                        </td>
                        <td className="py-3 px-3 align-top text-end font-mono tabular-nums">
                          <span
                            dir="ltr"
                            className={`ltr-isolate ${
                              bargained ? 'font-semibold text-blue-700' : 'text-slate-900'
                            }`}
                          >
                            {formatCurrencyLocalized(item.unitPrice, currency)}
                          </span>
                        </td>
                        <td className="py-3 px-4 align-top text-end font-mono font-semibold tabular-nums text-slate-950">
                          <span dir="ltr" className="ltr-isolate">
                            {formatCurrencyLocalized(item.lineTotal, currency)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals summary */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-sm">
            {hideCostDetails ? (
              <span />
            ) : (
              <span className="text-xs text-slate-500">
                {t.saleDetails.totalCostAtSale}{' '}
                <span dir="ltr" className="ltr-isolate font-mono tabular-nums">
                  {formatCurrencyLocalized(sale.totalCost, currency)}
                </span>
              </span>
            )}
            <div className="text-end">
              <span className="text-xs font-medium text-slate-500 me-3">
                {t.saleDetails.saleTotal}
              </span>
              <span
                dir="ltr"
                className={`ltr-isolate text-xl font-bold font-mono tabular-nums ${
                  isVoided ? 'line-through text-slate-400' : 'text-slate-950'
                }`}
              >
                {formatCurrencyLocalized(sale.totalAmount, currency)}
              </span>
            </div>
          </div>

          {confirmVoid && !isVoided && (
            <div className="p-4 rounded-lg border border-red-200 bg-red-50 space-y-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-red-700 mt-0.5 shrink-0" aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold text-red-950">
                    {t.saleDetails.voidConfirmTitle}
                  </p>
                  <p className="text-xs text-red-800 mt-0.5">
                    {interpolate(t.saleDetails.voidConfirmDesc, {
                      ref: shortRef,
                      count: itemsLabel,
                    })}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmVoid(false)}
                  disabled={isVoiding}
                  className="h-9 px-3.5 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmVoid}
                  disabled={isVoiding}
                  className="h-9 px-4 rounded-lg bg-red-700 text-white text-xs font-semibold hover:bg-red-800 disabled:opacity-60"
                >
                  {isVoiding ? t.saleDetails.voiding : t.saleDetails.confirmVoidBtn}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div>
            {!isVoided && !confirmVoid && (
              <button
                type="button"
                onClick={() => setConfirmVoid(true)}
                className="min-h-[40px] px-4 rounded-lg border border-red-200 bg-white text-sm font-medium text-red-700 hover:bg-red-50 active:scale-[0.98] transition-all inline-flex items-center gap-2 whitespace-nowrap"
              >
                <Ban className="w-4 h-4" aria-hidden="true" />
                {t.saleDetails.voidSaleBtn}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5 ms-auto">
            <button
              type="button"
              onClick={() => onPrintReceipt(sale)}
              className="min-h-[40px] px-4 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-100 active:scale-[0.98] transition-all inline-flex items-center gap-2 whitespace-nowrap"
            >
              <Printer className="w-4 h-4" aria-hidden="true" />
              {t.saleDetails.printReceipt}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="min-h-[40px] px-5 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 active:scale-[0.98] transition-all whitespace-nowrap"
            >
              {t.common.close}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
