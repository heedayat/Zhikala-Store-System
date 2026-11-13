import type { Product, ProductFormValues } from '../types/inventory';
import { findDuplicateBarcodeProduct } from './barcode';
import { getTranslations, interpolate, type AppLanguage } from './i18n';

export interface ProductValidationErrors {
  name?: string;
  barcode?: string;
  category?: string;
  sellingPrice?: string;
  costPrice?: string;
  quantityInStock?: string;
  reorderLevel?: string;
  brand?: string;
  ageRange?: string;
  supplier?: string;
  variantLabel?: string;
  notes?: string;
  photos?: string;
}

export interface ValidatedProductPayload {
  name: string;
  barcode: string;
  category: string;
  sellingPrice: number;
  costPrice: number;
  quantityInStock: number;
  reorderLevel: number | null;
  photos: string[];
  brand: string;
  ageRange: string;
  supplier: string;
  variantLabel: string;
  notes: string;
}

export function validateProductForm(
  values: ProductFormValues,
  existingProducts: Pick<Product, 'id' | 'name' | 'barcode'>[],
  editingProductId: string | null,
  lang: AppLanguage = 'en'
): { valid: true; data: ValidatedProductPayload } | { valid: false; errors: ProductValidationErrors } {
  const v = getTranslations(lang).validation;
  const errors: ProductValidationErrors = {};

  const name = values.name.trim();
  if (!name) {
    errors.name = v.productNameRequired;
  } else if (name.length > 160) {
    errors.name = v.productNameMax;
  }

  const barcode = values.barcode.trim();
  if (barcode.length > 64) {
    errors.barcode = v.barcodeMax;
  } else if (barcode) {
    const duplicate = findDuplicateBarcodeProduct(barcode, editingProductId, existingProducts);
    if (duplicate) {
      errors.barcode = interpolate(v.barcodeDuplicate, {
        barcode,
        name: duplicate.name,
      });
    }
  }

  const category = values.category.trim();
  if (category.length > 80) {
    errors.category = v.categoryMax;
  }

  const sellingRaw = values.sellingPrice.trim();
  const sellingPrice = Number(sellingRaw);
  if (!sellingRaw || !Number.isFinite(sellingPrice) || sellingPrice < 0) {
    errors.sellingPrice = v.sellingPriceInvalid;
  } else if (sellingPrice > 1_000_000_000) {
    errors.sellingPrice = v.sellingPriceTooLarge;
  }

  const costRaw = values.costPrice.trim();
  const costPrice = Number(costRaw);
  if (!costRaw || !Number.isFinite(costPrice) || costPrice < 0) {
    errors.costPrice = v.costPriceInvalid;
  } else if (costPrice > 1_000_000_000) {
    errors.costPrice = v.costPriceTooLarge;
  }

  const stockRaw = values.quantityInStock.trim();
  const quantityInStock = Number(stockRaw);
  if (!stockRaw || !Number.isFinite(quantityInStock) || quantityInStock < 0 || !Number.isInteger(quantityInStock)) {
    errors.quantityInStock = v.stockQtyInvalid;
  } else if (quantityInStock > 1_000_000) {
    errors.quantityInStock = v.stockQtyTooLarge;
  }

  const reorderRaw = values.reorderLevel.trim();
  let reorderLevel: number | null = null;
  if (reorderRaw !== '') {
    const parsedReorder = Number(reorderRaw);
    if (!Number.isFinite(parsedReorder) || parsedReorder < 0 || !Number.isInteger(parsedReorder)) {
      errors.reorderLevel = v.reorderLevelInvalid;
    } else if (parsedReorder > 1_000_000) {
      errors.reorderLevel = v.reorderLevelTooLarge;
    } else {
      reorderLevel = parsedReorder;
    }
  }

  const brand = values.brand.trim();
  if (brand.length > 80) errors.brand = v.brandMax;

  const ageRange = values.ageRange.trim();
  if (ageRange.length > 40) errors.ageRange = v.ageRangeMax;

  const supplier = values.supplier.trim();
  if (supplier.length > 100) errors.supplier = v.supplierMax;

  const variantLabel = values.variantLabel.trim();
  if (variantLabel.length > 60) errors.variantLabel = v.variantMax;

  const notes = values.notes.trim();
  if (notes.length > 1000) errors.notes = v.notesMax;

  if (values.photos.length > 8) {
    errors.photos = v.photosMax;
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    data: {
      name,
      barcode,
      category,
      sellingPrice: Math.round(sellingPrice * 100) / 100,
      costPrice: Math.round(costPrice * 100) / 100,
      quantityInStock,
      reorderLevel,
      photos: values.photos,
      brand,
      ageRange,
      supplier,
      variantLabel,
      notes,
    },
  };
}
