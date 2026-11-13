import { useEffect } from 'react';
import { Printer, X } from 'lucide-react';
import type { Sale } from '../types/inventory';
import { formatCurrency, formatNumber } from '../utils/formatters';
import { formatSaleDateTime } from '../utils/sales';

interface ReceiptModalProps {
  sale: Sale;
  shopName: string;
  currency: string;
  onClose: () => void;
}

export function ReceiptModal({
  sale,
  shopName,
  currency,
  onClose,
}: ReceiptModalProps) {
  const shortRef = sale.id.slice(-8).toUpperCase();

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
      className="fixed inset-0 z-50 bg-slate-950/45 flex items-center justify-center p-6"
    >
      <div className="bg-white border border-slate-200 rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4 shrink-0">
          <div>
            <h2 id="receipt-modal-title" className="text-base font-bold text-slate-950">
              Printable Receipt
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              80mm thermal or standard printer friendly
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close receipt preview"
            className="w-8 h-8 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="p-6 bg-slate-50 overflow-y-auto flex justify-center">
          <div
            id="printable-receipt"
            className="w-full max-w-[300px] bg-white border border-slate-300 rounded-md p-5 text-slate-950 font-sans text-xs shadow-xs"
          >
            <div className="text-center border-b border-dashed border-slate-300 pb-3">
              <p className="text-base font-bold tracking-tight text-slate-950">{shopName}</p>
              <p className="mt-1 text-[11px] text-slate-600 tabular-nums">
                {formatSaleDateTime(sale.createdAt)}
              </p>
              <p className="mt-0.5 text-[11px] font-mono text-slate-500">
                Receipt #{shortRef}
              </p>
              {sale.status === 'voided' && (
                <p className="mt-1.5 text-[11px] font-bold uppercase tracking-wider text-red-700">
                  VOIDED SALE
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
                    <span>
                      {formatNumber(item.quantity)} × {formatCurrency(item.unitPrice, currency)}
                    </span>
                    <span className="font-semibold text-slate-950">
                      {formatCurrency(item.lineTotal, currency)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-slate-600 tabular-nums">
                <span>Items</span>
                <span className="font-mono">{formatNumber(sale.itemCount)}</span>
              </div>
              <div className="flex items-center justify-between text-sm font-bold text-slate-950 pt-1 border-t border-slate-200 tabular-nums">
                <span>TOTAL</span>
                <span className="font-mono">{formatCurrency(sale.totalAmount, currency)}</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-600">
                <span>Payment</span>
                <span>Cash</span>
              </div>
            </div>

            <p className="mt-4 pt-3 border-t border-dashed border-slate-300 text-center text-[11px] text-slate-500">
              Thank you for shopping at {shopName}!
            </p>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 bg-white flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-4 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="h-10 px-5 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors inline-flex items-center gap-2 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            <Printer className="w-4 h-4" aria-hidden="true" />
            Print receipt
          </button>
        </div>
      </div>
    </div>
  );
}
