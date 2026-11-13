import { useEffect, useState } from 'react';
import { AlertTriangle, Ban, CheckCircle2, FileText, Printer, X } from 'lucide-react';
import type { Sale } from '../types/inventory';
import { formatActionError, formatCurrency, formatNumber } from '../utils/formatters';
import { formatSaleDateTime } from '../utils/sales';

interface SaleDetailsModalProps {
  sale: Sale;
  currency: string;
  onPrintReceipt: (sale: Sale) => void;
  onVoidSale: (saleId: string) => Promise<void>;
  onClose: () => void;
}

export function SaleDetailsModal({
  sale,
  currency,
  onPrintReceipt,
  onVoidSale,
  onClose,
}: SaleDetailsModalProps) {
  const [confirmVoid, setConfirmVoid] = useState(false);
  const [isVoiding, setIsVoiding] = useState(false);
  const [voidError, setVoidError] = useState<string | null>(null);

  const isVoided = sale.status === 'voided';
  const shortRef = sale.id.slice(-8).toUpperCase();

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
      className="fixed inset-0 z-50 bg-slate-950/45 flex items-center justify-center p-6"
    >
      <div className="bg-white border border-slate-200 rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-start justify-between gap-4 shrink-0">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 id="sale-details-modal-title" className="text-base font-bold text-slate-950">
                Sale #{shortRef}
              </h2>
              {isVoided ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700">
                  <Ban className="w-3.5 h-3.5" aria-hidden="true" />
                  Voided
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                  Completed
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
              {formatSaleDateTime(sale.createdAt)} · Cash · {formatNumber(sale.itemCount)} item
              {sale.itemCount === 1 ? '' : 's'}
              {isVoided && sale.voidedAt ? ` · Voided ${formatSaleDateTime(sale.voidedAt)}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sale details"
            className="w-8 h-8 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center shrink-0"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {sale.note ? (
            <div className="p-3.5 rounded-lg border border-amber-200 bg-amber-50/70 flex items-start gap-2.5">
              <FileText className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-amber-950">Sale note</p>
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
            <table className="w-full border-collapse text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <tr>
                  <th scope="col" className="py-2.5 px-4">
                    Item
                  </th>
                  <th scope="col" className="py-2.5 px-3 text-right w-16">
                    Qty
                  </th>
                  <th scope="col" className="py-2.5 px-3 text-right w-28">
                    List Price
                  </th>
                  <th scope="col" className="py-2.5 px-3 text-right w-28">
                    Sold At
                  </th>
                  <th scope="col" className="py-2.5 px-4 text-right w-32">
                    Line Total
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
                        <p className="text-xs text-slate-500 font-mono tabular-nums mt-0.5">
                          Cost: {formatCurrency(item.costPrice, currency)}
                          {belowCost ? (
                            <span className="ml-2 font-sans font-semibold text-amber-700">
                              · Sold below cost
                            </span>
                          ) : null}
                        </p>
                      </td>
                      <td className="py-3 px-3 align-top text-right font-mono tabular-nums text-slate-800">
                        {formatNumber(item.quantity)}
                      </td>
                      <td className="py-3 px-3 align-top text-right font-mono text-xs tabular-nums text-slate-500">
                        {formatCurrency(item.listPrice, currency)}
                      </td>
                      <td className="py-3 px-3 align-top text-right font-mono tabular-nums">
                        <span className={bargained ? 'font-semibold text-blue-700' : 'text-slate-900'}>
                          {formatCurrency(item.unitPrice, currency)}
                        </span>
                      </td>
                      <td className="py-3 px-4 align-top text-right font-mono font-semibold tabular-nums text-slate-950">
                        {formatCurrency(item.lineTotal, currency)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Totals summary */}
          <div className="flex items-center justify-between pt-2 text-sm">
            <span className="text-xs text-slate-500 font-mono tabular-nums">
              Total cost at sale: {formatCurrency(sale.totalCost, currency)}
            </span>
            <div className="text-right">
              <span className="text-xs font-medium text-slate-500 mr-3">Sale total</span>
              <span
                className={`text-xl font-bold font-mono tabular-nums ${
                  isVoided ? 'line-through text-slate-400' : 'text-slate-950'
                }`}
              >
                {formatCurrency(sale.totalAmount, currency)}
              </span>
            </div>
          </div>

          {confirmVoid && !isVoided && (
            <div className="p-4 rounded-lg border border-red-200 bg-red-50 space-y-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-red-700 mt-0.5 shrink-0" aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold text-red-950">
                    Void this sale and restore stock?
                  </p>
                  <p className="text-xs text-red-800 mt-0.5">
                    This marks Sale #{shortRef} as voided (kept in history) and adds{' '}
                    {formatNumber(sale.itemCount)} unit{sale.itemCount === 1 ? '' : 's'} back into
                    inventory via stock movement records.
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
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmVoid}
                  disabled={isVoiding}
                  className="h-9 px-4 rounded-lg bg-red-700 text-white text-xs font-semibold hover:bg-red-800 disabled:opacity-60"
                >
                  {isVoiding ? 'Voiding sale...' : 'Confirm void & restore stock'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
          <div>
            {!isVoided && !confirmVoid && (
              <button
                type="button"
                onClick={() => setConfirmVoid(true)}
                className="h-10 px-4 rounded-lg border border-red-200 bg-white text-sm font-medium text-red-700 hover:bg-red-50 transition-colors inline-flex items-center gap-2 whitespace-nowrap"
              >
                <Ban className="w-4 h-4" aria-hidden="true" />
                Void sale
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onPrintReceipt(sale)}
              className="h-10 px-4 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors inline-flex items-center gap-2 whitespace-nowrap"
            >
              <Printer className="w-4 h-4" aria-hidden="true" />
              Print receipt
            </button>
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-5 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors whitespace-nowrap"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
