import { useEffect, useState } from 'react';
import { Printer, X } from 'lucide-react';
import type { Product } from '../types/inventory';
import { formatCurrency } from '../utils/formatters';
import { BarcodeSvg } from './BarcodeSvg';

interface BarcodeLabelModalProps {
  product: Pick<Product, 'name' | 'barcode' | 'sellingPrice' | 'variantLabel'>;
  shopName: string;
  currency: string;
  onClose: () => void;
}

export function BarcodeLabelModal({
  product,
  shopName,
  currency,
  onClose,
}: BarcodeLabelModalProps) {
  const [labelSize, setLabelSize] = useState<'standard' | 'large'>('standard');

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
      aria-labelledby="barcode-label-modal-title"
      className="fixed inset-0 z-50 bg-slate-950/45 flex items-center justify-center p-6"
    >
      <div className="bg-white border border-slate-200 rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div>
            <h2
              id="barcode-label-modal-title"
              className="text-base font-bold text-slate-950"
            >
              Print Barcode Label
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Ready for thermal label printers or standard A4 sheets
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close label preview"
            className="w-8 h-8 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs font-semibold text-slate-600">Label size</span>
            <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => setLabelSize('standard')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  labelSize === 'standard'
                    ? 'bg-white text-slate-950 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Standard (50×30mm)
              </button>
              <button
                type="button"
                onClick={() => setLabelSize('large')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  labelSize === 'large'
                    ? 'bg-white text-slate-950 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Large (70×40mm)
              </button>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 flex items-center justify-center">
            <div
              id="printable-barcode-label"
              className={`bg-white border border-slate-300 rounded-md text-center flex flex-col items-center justify-between ${
                labelSize === 'standard' ? 'w-64 p-4' : 'w-80 p-5'
              }`}
            >
              <div className="w-full">
                <p className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
                  {shopName}
                </p>
                <p
                  className={`mt-1 font-bold text-slate-950 leading-tight ${
                    labelSize === 'standard' ? 'text-sm' : 'text-base'
                  }`}
                >
                  {product.name}
                </p>
                {product.variantLabel ? (
                  <p className="mt-0.5 text-xs font-medium text-slate-600">
                    {product.variantLabel}
                  </p>
                ) : null}
              </div>

              <div className="my-3 w-full flex justify-center">
                <BarcodeSvg
                  value={product.barcode}
                  height={labelSize === 'standard' ? 46 : 60}
                  className="w-full max-w-[240px]"
                />
              </div>

              <p
                className={`font-mono font-bold text-slate-950 tabular-nums ${
                  labelSize === 'standard' ? 'text-sm' : 'text-base'
                }`}
              >
                {formatCurrency(product.sellingPrice, currency)}
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3">
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
            Print label
          </button>
        </div>
      </div>
    </div>
  );
}
