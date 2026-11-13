import { useEffect } from 'react';
import { Printer, X } from 'lucide-react';
import { useTranslation } from '../contexts/I18nContext';
import type { Sale } from '../types/inventory';
import { formatNumber } from '../utils/formatters';
import { interpolate } from '../utils/i18n';
import { formatSaleDateTime } from '../utils/sales';
import { StoreLogo } from './StoreLogo';

interface ReceiptModalProps {
  sale: Sale;
  shopName: string;
  storeSubtitle?: string;
  receiptFooter?: string;
  logoUrl?: string;
  currency: string;
  onClose: () => void;
}

export function ReceiptModal({
  sale,
  shopName,
  storeSubtitle,
  receiptFooter,
  logoUrl,
  currency,
  onClose,
}: ReceiptModalProps) {
  const { lang, t, formatCurrencyLocalized, paymentLabel } = useTranslation();
  const shortRef = sale.id.slice(-8).toUpperCase();
  const cleanSubtitle = storeSubtitle?.trim() ?? '';
  const cleanFooter =
    receiptFooter?.trim() || interpolate(t.receipt.defaultFooter, { shopName });
  const resolvedPaymentLabel = paymentLabel(sale.paymentMethod);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="receipt-modal-title"
      className="modal-backdrop-enter fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6"
    >
      <div className="modal-panel-enter bg-white border border-slate-200 rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-5 sm:px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4 shrink-0">
          <div className="text-start">
            <h2 id="receipt-modal-title" className="text-base font-bold text-slate-950">
              {t.receipt.title}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">{t.receipt.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.receipt.closeAria}
            className="w-9 h-9 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="p-5 sm:p-6 bg-slate-50 overflow-y-auto flex justify-center">
          <div
            id="printable-receipt"
            className="w-full max-w-[300px] bg-white border border-slate-300 rounded-md p-5 text-slate-950 font-sans text-xs shadow-xs text-start"
          >
            <div className="text-center border-b border-dashed border-slate-300 pb-3">
              <div className="inline-flex items-center justify-center gap-2.5 max-w-full">
                <StoreLogo logoUrl={logoUrl} shopName={shopName} variant="receipt" />
                <p className="text-base font-bold tracking-tight text-slate-950 text-start break-words">
                  {shopName}
                </p>
              </div>
              {cleanSubtitle && (
                <p dir="auto" className="mt-1 text-[11px] font-medium text-slate-600">
                  {cleanSubtitle}
                </p>
              )}
              <p dir="ltr" className="ltr-isolate mt-1 text-[11px] text-slate-600 tabular-nums">
                {formatSaleDateTime(sale.createdAt, lang)}
              </p>
              <p className="mt-0.5 text-[11px] font-mono text-slate-500">
                {t.receipt.receiptNoPrefix}{' '}
                <span dir="ltr" className="ltr-isolate">
                  #{shortRef}
                </span>
              </p>
              {sale.status === 'voided' && (
                <p className="mt-1.5 text-[11px] font-bold uppercase tracking-wider text-red-700">
                  {t.receipt.voidedSale}
                </p>
              )}
            </div>

            <div className="py-3 border-b border-dashed border-slate-300 space-y-2.5">
              {sale.items.map((item, idx) => (
                <div key={`${item.productId}-${idx}`} className="space-y-0.5">
                  <p className="font-semibold text-slate-950 leading-snug">
                    {item.productName}
                  </p>
                  <div className="flex items-center justify-between text-[11px] text-slate-600 font-mono tabular-nums">
                    <span dir="ltr" className="ltr-isolate">
                      {formatNumber(item.quantity)} × {formatCurrencyLocalized(item.unitPrice, currency)}
                    </span>
                    <span dir="ltr" className="ltr-isolate font-semibold text-slate-950">
                      {formatCurrencyLocalized(item.lineTotal, currency)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-slate-600 tabular-nums">
                <span>{t.receipt.items}</span>
                <span dir="ltr" className="ltr-isolate font-mono">
                  {formatNumber(sale.itemCount)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm font-bold text-slate-950 pt-1 border-t border-slate-200 tabular-nums">
                <span>{t.receipt.total}</span>
                <span dir="ltr" className="ltr-isolate font-mono">
                  {formatCurrencyLocalized(sale.totalAmount, currency)}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-600">
                <span>{t.receipt.payment}</span>
                <span className="font-medium text-slate-900">{resolvedPaymentLabel}</span>
              </div>
            </div>

            <p
              dir="auto"
              className="mt-4 pt-3 border-t border-dashed border-slate-300 text-center text-[11px] text-slate-500 whitespace-pre-line break-words"
            >
              {cleanFooter}
            </p>
          </div>
        </div>

        <div className="px-5 sm:px-6 py-4 border-t border-slate-200 bg-white flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] px-4 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all duration-200 ease-out active:scale-[0.98] whitespace-nowrap"
          >
            {t.common.close}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="min-h-[40px] px-5 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-all duration-200 ease-out active:scale-[0.98] inline-flex items-center gap-2 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            <Printer className="w-4 h-4" aria-hidden="true" />
            {t.receipt.printReceipt}
          </button>
        </div>
      </div>
    </div>
  );
}
