import { useEffect, useState } from 'react';
import { Printer, X } from 'lucide-react';
import { useTranslation } from '../contexts/I18nContext';
import type { Product } from '../types/inventory';
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
  const { t, formatCurrencyLocalized } = useTranslation();
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
      className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-xs modal-backdrop-enter flex items-center justify-center p-3 sm:p-6"
    >
      <div className="bg-white border border-slate-200 rounded-xl shadow-xl w-full max-w-lg max-h-[92vh] overflow-y-auto modal-panel-enter">
        <div className="px-4 sm:px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="text-start">
            <h2
              id="barcode-label-modal-title"
              className="text-base font-bold text-slate-950"
            >
              {t.barcodeModal.title}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">{t.barcodeModal.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.barcodeModal.closeAria}
            className="w-9 h-9 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center shrink-0"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-semibold text-slate-600">{t.barcodeModal.labelSize}</span>
            <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => setLabelSize('standard')}
                className={`min-h-[34px] px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  labelSize === 'standard'
                    ? 'bg-white text-slate-950 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t.barcodeModal.standardSize}
              </button>
              <button
                type="button"
                onClick={() => setLabelSize('large')}
                className={`min-h-[34px] px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  labelSize === 'large'
                    ? 'bg-white text-slate-950 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t.barcodeModal.largeSize}
              </button>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-8 flex items-center justify-center overflow-x-auto">
            <div
              id="printable-barcode-label"
              className={`bg-white border border-slate-300 rounded-md text-center flex flex-col items-center justify-between ${
                labelSize === 'standard' ? 'w-64 p-4' : 'w-full max-w-80 p-5'
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

              <div dir="ltr" className="my-3 w-full flex justify-center">
                <BarcodeSvg
                  value={product.barcode}
                  height={labelSize === 'standard' ? 46 : 60}
                  className="w-full max-w-[240px]"
                />
              </div>

              <p
                dir="ltr"
                className={`ltr-isolate font-mono font-bold text-slate-950 tabular-nums ${
                  labelSize === 'standard' ? 'text-sm' : 'text-base'
                }`}
              >
                {formatCurrencyLocalized(product.sellingPrice, currency)}
              </p>
            </div>
          </div>
        </div>

        <div className="px-4 sm:px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] px-4 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 active:scale-[0.98] transition-all whitespace-nowrap"
          >
            {t.common.close}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="min-h-[40px] px-5 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 active:scale-[0.98] transition-all inline-flex items-center gap-2 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            <Printer className="w-4 h-4" aria-hidden="true" />
            {t.barcodeModal.printLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
