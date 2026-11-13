import { useEffect, useId, useMemo, useState, type FormEvent } from 'react';
import {
  Archive,
  ArchiveRestore,
  ChevronDown,
  ChevronRight,
  Printer,
  Wand2,
  X,
} from 'lucide-react';
import type { Product, ProductFormValues } from '../types/inventory';
import { generateUniqueBarcode } from '../utils/barcode';
import { formatActionError } from '../utils/formatters';
import {
  validateProductForm,
  type ProductValidationErrors,
  type ValidatedProductPayload,
} from '../utils/productValidation';
import { generateDocumentId } from '../services/inventoryService';
import { CategoryCombobox } from './CategoryCombobox';
import { ConfirmDialog } from './ConfirmDialog';
import { ProductPhotoUploader } from './ProductPhotoUploader';

interface ProductFormModalProps {
  ownerId: string;
  editingProduct: Product | null;
  initialBarcode?: string;
  allProducts: Product[];
  usedCategories: string[];
  currency: string;
  isPreviewMode: boolean;
  onSave: (productId: string, payload: ValidatedProductPayload, isNew: boolean) => Promise<void>;
  onArchiveToggle: (productId: string, archive: boolean) => Promise<void>;
  onPrintLabel: (preview: {
    name: string;
    barcode: string;
    sellingPrice: number;
    variantLabel?: string;
  }) => void;
  onClose: () => void;
}

function buildInitialValues(
  editingProduct: Product | null,
  initialBarcode?: string
): ProductFormValues {
  if (editingProduct) {
    return {
      name: editingProduct.name ?? '',
      barcode: editingProduct.barcode ?? '',
      category: editingProduct.category ?? '',
      sellingPrice: String(editingProduct.sellingPrice ?? ''),
      costPrice: String(editingProduct.costPrice ?? ''),
      quantityInStock: String(editingProduct.quantityInStock ?? 0),
      reorderLevel:
        editingProduct.reorderLevel !== undefined && editingProduct.reorderLevel !== null
          ? String(editingProduct.reorderLevel)
          : '',
      photos: editingProduct.photos ?? [],
      brand: editingProduct.brand ?? '',
      ageRange: editingProduct.ageRange ?? '',
      supplier: editingProduct.supplier ?? '',
      variantLabel: editingProduct.variantLabel ?? '',
      notes: editingProduct.notes ?? '',
    };
  }

  return {
    name: '',
    barcode: initialBarcode ?? '',
    category: '',
    sellingPrice: '',
    costPrice: '',
    quantityInStock: '0',
    reorderLevel: '',
    photos: [],
    brand: '',
    ageRange: '',
    supplier: '',
    variantLabel: '',
    notes: '',
  };
}

export function ProductFormModal({
  ownerId,
  editingProduct,
  initialBarcode,
  allProducts,
  usedCategories,
  currency,
  isPreviewMode,
  onSave,
  onArchiveToggle,
  onPrintLabel,
  onClose,
}: ProductFormModalProps) {
  const titleId = useId();
  const [draftProductId] = useState<string>(() => editingProduct?.id ?? generateDocumentId());
  const [values, setValues] = useState<ProductFormValues>(() =>
    buildInitialValues(editingProduct, initialBarcode)
  );
  const [errors, setErrors] = useState<ProductValidationErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPhotoBusy, setIsPhotoBusy] = useState(false);
  const [confirmingArchive, setConfirmingArchive] = useState(false);

  const hasMoreDetailsFilled = useMemo(() => {
    if (!editingProduct) return false;
    return Boolean(
      editingProduct.brand ||
        editingProduct.ageRange ||
        editingProduct.supplier ||
        editingProduct.variantLabel ||
        editingProduct.notes
    );
  }, [editingProduct]);

  const [showMoreDetails, setShowMoreDetails] = useState<boolean>(hasMoreDetailsFilled);

  useEffect(() => {
    setValues(buildInitialValues(editingProduct, initialBarcode));
    setErrors({});
    setSubmitError(null);
    setConfirmingArchive(false);
  }, [editingProduct, initialBarcode]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !confirmingArchive && !isSaving) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [confirmingArchive, isSaving, onClose]);

  function updateField<K extends keyof ProductFormValues>(field: K, value: ProductFormValues[K]) {
    setValues((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof ProductValidationErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }

  function handleGenerateBarcode() {
    const existingCodes = allProducts
      .filter((p) => p.id !== editingProduct?.id)
      .map((p) => p.barcode);
    const code = generateUniqueBarcode(existingCodes);
    updateField('barcode', code);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (isPhotoBusy || isSaving) return;

    const validation = validateProductForm(values, allProducts, editingProduct?.id ?? null);
    if (!validation.valid) {
      setErrors(validation.errors);
      if (
        validation.errors.brand ||
        validation.errors.ageRange ||
        validation.errors.supplier ||
        validation.errors.variantLabel ||
        validation.errors.notes
      ) {
        setShowMoreDetails(true);
      }
      return;
    }

    setIsSaving(true);
    setSubmitError(null);
    try {
      await onSave(draftProductId, validation.data, editingProduct === null);
      onClose();
    } catch (err) {
      setSubmitError(formatActionError(err, 'Failed to save product.'));
      setIsSaving(false);
    }
  }

  async function handleArchiveAction(archive: boolean) {
    if (!editingProduct || isSaving) return;
    setIsSaving(true);
    setSubmitError(null);
    try {
      await onArchiveToggle(editingProduct.id, archive);
      setConfirmingArchive(false);
      onClose();
    } catch (err) {
      setSubmitError(formatActionError(err, 'Failed to update product archive status.'));
      setIsSaving(false);
      setConfirmingArchive(false);
    }
  }

  const filledMoreCount = [
    values.brand,
    values.ageRange,
    values.supplier,
    values.variantLabel,
    values.notes,
  ].filter((v) => v.trim() !== '').length;

  const canPrintLabel = values.barcode.trim().length > 0 && values.name.trim().length > 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-40 bg-slate-950/45 flex items-center justify-center p-6"
    >
      <div className="bg-white border border-slate-200 rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <h2 id={titleId} className="text-base font-bold text-slate-950 truncate">
              {editingProduct ? 'Edit Product' : 'Add Product'}
            </h2>
            {editingProduct?.isArchived && (
              <span className="text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                Archived
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {canPrintLabel && (
              <button
                type="button"
                onClick={() =>
                  onPrintLabel({
                    name: values.name.trim(),
                    barcode: values.barcode.trim(),
                    sellingPrice: Number(values.sellingPrice) || 0,
                    variantLabel: values.variantLabel.trim() || undefined,
                  })
                }
                className="h-8 px-3 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-800 hover:bg-slate-50 inline-flex items-center gap-1.5 whitespace-nowrap"
              >
                <Printer className="w-3.5 h-3.5" aria-hidden="true" />
                Print label
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close product form"
              className="w-8 h-8 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {submitError && (
            <div
              role="alert"
              className="p-3.5 rounded-lg border border-red-200 bg-red-50 text-xs text-red-800"
            >
              {submitError}
            </div>
          )}

          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12">
              <label htmlFor="product-name-input" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Product name <span className="text-red-600">*</span>
              </label>
              <input
                id="product-name-input"
                type="text"
                autoFocus
                value={values.name}
                onChange={(e) => updateField('name', e.target.value)}
                maxLength={160}
                placeholder="e.g. Wooden Express Train Set"
                className={`w-full h-10 px-3 rounded-lg border text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                  errors.name
                    ? 'border-red-400 focus:border-red-600 focus:ring-red-500/15'
                    : 'border-slate-300 focus:border-blue-600 focus:ring-blue-600/15'
                }`}
              />
              {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
            </div>

            <div className="col-span-7">
              <label htmlFor="product-barcode-input" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Barcode
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="product-barcode-input"
                  type="text"
                  value={values.barcode}
                  onChange={(e) => updateField('barcode', e.target.value)}
                  onKeyDown={(e) => {
                    // USB barcode scanners press Enter after typing digits; keep the form open
                    if (e.key === 'Enter') {
                      e.preventDefault();
                    }
                  }}
                  maxLength={64}
                  placeholder="Scan barcode or click Generate"
                  className={`flex-1 h-10 px-3 rounded-lg border text-sm font-mono text-slate-900 placeholder:font-sans placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                    errors.barcode
                      ? 'border-red-400 focus:border-red-600 focus:ring-red-500/15'
                      : 'border-slate-300 focus:border-blue-600 focus:ring-blue-600/15'
                  }`}
                />
                <button
                  type="button"
                  onClick={handleGenerateBarcode}
                  className="h-10 px-3 rounded-lg border border-slate-300 bg-slate-50 text-xs font-semibold text-slate-800 hover:bg-slate-100 transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
                >
                  <Wand2 className="w-3.5 h-3.5" aria-hidden="true" />
                  Generate barcode
                </button>
              </div>
              {errors.barcode && <p className="mt-1 text-xs text-red-600">{errors.barcode}</p>}
            </div>

            <div className="col-span-5">
              <CategoryCombobox
                value={values.category}
                onChange={(next) => updateField('category', next)}
                suggestions={usedCategories}
                error={errors.category}
              />
            </div>

            <div className="col-span-3">
              <label htmlFor="product-selling-price" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Selling price ({currency}) <span className="text-red-600">*</span>
              </label>
              <input
                id="product-selling-price"
                type="number"
                min={0}
                step={1}
                value={values.sellingPrice}
                onChange={(e) => updateField('sellingPrice', e.target.value)}
                placeholder="25000"
                className={`w-full h-10 px-3 rounded-lg border text-sm font-mono tabular-nums text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                  errors.sellingPrice
                    ? 'border-red-400 focus:border-red-600 focus:ring-red-500/15'
                    : 'border-slate-300 focus:border-blue-600 focus:ring-blue-600/15'
                }`}
              />
              {errors.sellingPrice && (
                <p className="mt-1 text-xs text-red-600">{errors.sellingPrice}</p>
              )}
            </div>

            <div className="col-span-3">
              <label htmlFor="product-cost-price" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Cost price ({currency}) <span className="text-red-600">*</span>
              </label>
              <input
                id="product-cost-price"
                type="number"
                min={0}
                step={1}
                value={values.costPrice}
                onChange={(e) => updateField('costPrice', e.target.value)}
                placeholder="15000"
                className={`w-full h-10 px-3 rounded-lg border text-sm font-mono tabular-nums text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                  errors.costPrice
                    ? 'border-red-400 focus:border-red-600 focus:ring-red-500/15'
                    : 'border-slate-300 focus:border-blue-600 focus:ring-blue-600/15'
                }`}
              />
              {errors.costPrice && (
                <p className="mt-1 text-xs text-red-600">{errors.costPrice}</p>
              )}
            </div>

            <div className="col-span-3">
              <label htmlFor="product-stock-qty" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Quantity in stock <span className="text-red-600">*</span>
              </label>
              <input
                id="product-stock-qty"
                type="number"
                min={0}
                step={1}
                value={values.quantityInStock}
                onChange={(e) => updateField('quantityInStock', e.target.value)}
                placeholder="0"
                className={`w-full h-10 px-3 rounded-lg border text-sm font-mono tabular-nums text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                  errors.quantityInStock
                    ? 'border-red-400 focus:border-red-600 focus:ring-red-500/15'
                    : 'border-slate-300 focus:border-blue-600 focus:ring-blue-600/15'
                }`}
              />
              {errors.quantityInStock && (
                <p className="mt-1 text-xs text-red-600">{errors.quantityInStock}</p>
              )}
            </div>

            <div className="col-span-3">
              <label htmlFor="product-reorder-level" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Reorder level
              </label>
              <input
                id="product-reorder-level"
                type="number"
                min={0}
                step={1}
                value={values.reorderLevel}
                onChange={(e) => updateField('reorderLevel', e.target.value)}
                placeholder="Optional"
                className={`w-full h-10 px-3 rounded-lg border text-sm font-mono tabular-nums text-slate-900 placeholder:font-sans placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                  errors.reorderLevel
                    ? 'border-red-400 focus:border-red-600 focus:ring-red-500/15'
                    : 'border-slate-300 focus:border-blue-600 focus:ring-blue-600/15'
                }`}
              />
              {errors.reorderLevel && (
                <p className="mt-1 text-xs text-red-600">{errors.reorderLevel}</p>
              )}
            </div>
          </div>

          <ProductPhotoUploader
            ownerId={ownerId}
            productId={draftProductId}
            photos={values.photos}
            onChange={(nextPhotos) => updateField('photos', nextPhotos)}
            isPreviewMode={isPreviewMode}
            onBusyChange={setIsPhotoBusy}
          />
          {errors.photos && <p className="text-xs text-red-600">{errors.photos}</p>}

          <div className="border-t border-slate-200 pt-4">
            <button
              type="button"
              aria-expanded={showMoreDetails}
              onClick={() => setShowMoreDetails((prev) => !prev)}
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-blue-600 rounded"
            >
              {showMoreDetails ? (
                <ChevronDown className="w-4 h-4 text-slate-500" aria-hidden="true" />
              ) : (
                <ChevronRight className="w-4 h-4 text-slate-500" aria-hidden="true" />
              )}
              <span>More details</span>
              {!showMoreDetails && filledMoreCount > 0 && (
                <span className="text-xs font-normal text-slate-500">
                  ({filledMoreCount} filled)
                </span>
              )}
            </button>

            {showMoreDetails && (
              <div className="mt-4 grid grid-cols-12 gap-4">
                <div className="col-span-6">
                  <label htmlFor="product-brand" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Brand
                  </label>
                  <input
                    id="product-brand"
                    type="text"
                    value={values.brand}
                    onChange={(e) => updateField('brand', e.target.value)}
                    maxLength={80}
                    placeholder="e.g. LEGO, Mattel"
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
                  />
                  {errors.brand && <p className="mt-1 text-xs text-red-600">{errors.brand}</p>}
                </div>

                <div className="col-span-6">
                  <label htmlFor="product-age-range" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Age range
                  </label>
                  <input
                    id="product-age-range"
                    type="text"
                    value={values.ageRange}
                    onChange={(e) => updateField('ageRange', e.target.value)}
                    maxLength={40}
                    placeholder="e.g. 3-6 years"
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
                  />
                  {errors.ageRange && (
                    <p className="mt-1 text-xs text-red-600">{errors.ageRange}</p>
                  )}
                </div>

                <div className="col-span-6">
                  <label htmlFor="product-supplier" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Supplier
                  </label>
                  <input
                    id="product-supplier"
                    type="text"
                    value={values.supplier}
                    onChange={(e) => updateField('supplier', e.target.value)}
                    maxLength={100}
                    placeholder="e.g. Baghdad Toy Wholesale"
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
                  />
                  {errors.supplier && (
                    <p className="mt-1 text-xs text-red-600">{errors.supplier}</p>
                  )}
                </div>

                <div className="col-span-6">
                  <label htmlFor="product-variant" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Variant label
                  </label>
                  <input
                    id="product-variant"
                    type="text"
                    value={values.variantLabel}
                    onChange={(e) => updateField('variantLabel', e.target.value)}
                    maxLength={60}
                    placeholder="e.g. Blue, Large Box"
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
                  />
                  {errors.variantLabel && (
                    <p className="mt-1 text-xs text-red-600">{errors.variantLabel}</p>
                  )}
                </div>

                <div className="col-span-12">
                  <label htmlFor="product-notes" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Notes
                  </label>
                  <textarea
                    id="product-notes"
                    rows={3}
                    value={values.notes}
                    onChange={(e) => updateField('notes', e.target.value)}
                    maxLength={1000}
                    placeholder="Battery requirements, shelf spot, or wholesale notes..."
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
                  />
                  {errors.notes && <p className="mt-1 text-xs text-red-600">{errors.notes}</p>}
                </div>
              </div>
            )}
          </div>
          </div>

          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-4 shrink-0">
            <div>
              {editingProduct && (
                editingProduct.isArchived ? (
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => void handleArchiveAction(false)}
                    className="h-10 px-3.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-800 hover:bg-slate-50 inline-flex items-center gap-2 whitespace-nowrap"
                  >
                    <ArchiveRestore className="w-4 h-4 text-emerald-600" aria-hidden="true" />
                    Restore to active
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => setConfirmingArchive(true)}
                    className="h-10 px-3.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:text-red-700 hover:border-red-300 hover:bg-red-50/50 transition-colors inline-flex items-center gap-2 whitespace-nowrap"
                  >
                    <Archive className="w-4 h-4" aria-hidden="true" />
                    Archive product
                  </button>
                )
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="h-10 px-4 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving || isPhotoBusy}
                className="h-10 px-5 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                {isSaving ? 'Saving...' : editingProduct ? 'Save changes' : 'Save product'}
              </button>
            </div>
          </div>
        </form>
      </div>

      <ConfirmDialog
        open={confirmingArchive && editingProduct !== null}
        title="Archive this product?"
        description={`"${editingProduct?.name ?? 'This product'}" will be hidden from active inventory and the Sell screen. Historical sales and stock movements will remain intact, and you can restore it anytime from the Archived tab.`}
        confirmLabel="Archive product"
        cancelLabel="Keep active"
        tone="danger"
        isBusy={isSaving}
        onConfirm={() => handleArchiveAction(true)}
        onCancel={() => setConfirmingArchive(false)}
      />
    </div>
  );
}
