import type { Product, ProductFormValues } from '../types/inventory';
import { findDuplicateBarcodeProduct } from './barcode';

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
  editingProductId: string | null
): { valid: true; data: ValidatedProductPayload } | { valid: false; errors: ProductValidationErrors } {
  const errors: ProductValidationErrors = {};

  const name = values.name.trim();
  if (!name) {
    errors.name = 'Product name is required.';
  } else if (name.length > 160) {
    errors.name = 'Product name must be 160 characters or fewer.';
  }

  const barcode = values.barcode.trim();
  if (barcode.length > 64) {
    errors.barcode = 'Barcode must be 64 characters or fewer.';
  } else if (barcode) {
    const duplicate = findDuplicateBarcodeProduct(barcode, editingProductId, existingProducts);
    if (duplicate) {
      errors.barcode = `Barcode "${barcode}" is already used by "${duplicate.name}".`;
    }
  }

  const category = values.category.trim();
  if (category.length > 80) {
    errors.category = 'Category must be 80 characters or fewer.';
  }

  const sellingRaw = values.sellingPrice.trim();
  const sellingPrice = Number(sellingRaw);
  if (!sellingRaw || !Number.isFinite(sellingPrice) || sellingPrice < 0) {
    errors.sellingPrice = 'Enter a valid selling price (0 or higher).';
  } else if (sellingPrice > 1_000_000_000) {
    errors.sellingPrice = 'Selling price is too large.';
  }

  const costRaw = values.costPrice.trim();
  const costPrice = Number(costRaw);
  if (!costRaw || !Number.isFinite(costPrice) || costPrice < 0) {
    errors.costPrice = 'Enter a valid cost price (0 or higher).';
  } else if (costPrice > 1_000_000_000) {
    errors.costPrice = 'Cost price is too large.';
  }

  const stockRaw = values.quantityInStock.trim();
  const quantityInStock = Number(stockRaw);
  if (!stockRaw || !Number.isFinite(quantityInStock) || quantityInStock < 0 || !Number.isInteger(quantityInStock)) {
    errors.quantityInStock = 'Enter a whole number (0 or higher).';
  } else if (quantityInStock > 1_000_000) {
    errors.quantityInStock = 'Stock quantity is too large.';
  }

  const reorderRaw = values.reorderLevel.trim();
  let reorderLevel: number | null = null;
  if (reorderRaw !== '') {
    const parsedReorder = Number(reorderRaw);
    if (!Number.isFinite(parsedReorder) || parsedReorder < 0 || !Number.isInteger(parsedReorder)) {
      errors.reorderLevel = 'Reorder level must be a whole number (0 or higher).';
    } else if (parsedReorder > 1_000_000) {
      errors.reorderLevel = 'Reorder level is too large.';
    } else {
      reorderLevel = parsedReorder;
    }
  }

  const brand = values.brand.trim();
  if (brand.length > 80) errors.brand = 'Brand must be 80 characters or fewer.';

  const ageRange = values.ageRange.trim();
  if (ageRange.length > 40) errors.ageRange = 'Age range must be 40 characters or fewer.';

  const supplier = values.supplier.trim();
  if (supplier.length > 100) errors.supplier = 'Supplier must be 100 characters or fewer.';

  const variantLabel = values.variantLabel.trim();
  if (variantLabel.length > 60) errors.variantLabel = 'Variant label must be 60 characters or fewer.';

  const notes = values.notes.trim();
  if (notes.length > 1000) errors.notes = 'Notes must be 1000 characters or fewer.';

  if (values.photos.length > 8) {
    errors.photos = 'Maximum 8 photos allowed per product.';
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
      sellingPrice: Math.round(sellingPrice),
      costPrice: Math.round(costPrice),
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
