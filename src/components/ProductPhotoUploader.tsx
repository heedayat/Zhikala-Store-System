import { useId, useRef, useState } from 'react';
import { Image as ImageIcon, Loader2, Star, Trash2, Upload } from 'lucide-react';
import { useTranslation } from '../contexts/I18nContext';
import { compressProductImage } from '../utils/imageCompression';
import { interpolate } from '../utils/i18n';
import {
  MAX_INLINE_PHOTOS,
  tryUploadProductPhotoToStorage,
} from '../services/inventoryService';

interface ProductPhotoUploaderProps {
  ownerId: string;
  productId: string;
  photos: string[];
  onChange: (photos: string[]) => void;
  isPreviewMode: boolean;
  onBusyChange?: (busy: boolean) => void;
}

export function ProductPhotoUploader({
  ownerId,
  productId,
  photos,
  onChange,
  isPreviewMode,
  onBusyChange,
}: ProductPhotoUploaderProps) {
  const { t } = useTranslation();
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const [usingInlineFallback, setUsingInlineFallback] = useState(isPreviewMode);
  const [brokenIndices, setBrokenIndices] = useState<Record<number, boolean>>({});

  const maxAllowed = usingInlineFallback ? MAX_INLINE_PHOTOS : 8;

  async function processFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setUploadNotice(null);

    const files = Array.from(fileList);
    const remainingSlots = Math.max(0, maxAllowed - photos.length);
    if (remainingSlots === 0) {
      setUploadNotice(interpolate(t.productForm.maxPhotosReached, { max: maxAllowed }));
      return;
    }

    const filesToProcess = files.slice(0, remainingSlots);
    const skippedCount = files.length - filesToProcess.length;

    setIsProcessing(true);
    onBusyChange?.(true);

    const addedUrls: string[] = [];
    let fellBackToInline = usingInlineFallback;
    const errors: string[] = [];

    for (const file of filesToProcess) {
      try {
        const compressed = await compressProductImage(file);

        if (!isPreviewMode && !fellBackToInline) {
          try {
            const uploaded = await tryUploadProductPhotoToStorage(
              ownerId,
              productId,
              compressed.blob
            );
            addedUrls.push(uploaded.url);
            continue;
          } catch {
            fellBackToInline = true;
            setUsingInlineFallback(true);
          }
        }

        // Enforce 4-photo limit when storing compressed JPEG versions inline
        if (photos.length + addedUrls.length >= MAX_INLINE_PHOTOS) {
          errors.push(interpolate(t.productForm.inlineLimitError, { max: MAX_INLINE_PHOTOS }));
          break;
        }
        addedUrls.push(compressed.dataUrl);
      } catch (err) {
        errors.push(err instanceof Error ? err.message : `Failed to process "${file.name}".`);
      }
    }

    if (addedUrls.length > 0) {
      onChange([...photos, ...addedUrls].slice(0, fellBackToInline ? MAX_INLINE_PHOTOS : 8));
    }

    if (errors.length > 0) {
      setUploadNotice(errors[0]);
    } else if (skippedCount > 0) {
      setUploadNotice(
        interpolate(t.productForm.skippedPhotos, {
          added: addedUrls.length,
          skipped: skippedCount,
          max: fellBackToInline ? MAX_INLINE_PHOTOS : maxAllowed,
        })
      );
    }

    setIsProcessing(false);
    onBusyChange?.(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  function handleRemove(index: number) {
    onChange(photos.filter((_, idx) => idx !== index));
    setUploadNotice(null);
  }

  function handleSetCover(index: number) {
    if (index === 0 || index >= photos.length) return;
    const target = photos[index];
    const reordered = [target, ...photos.filter((_, idx) => idx !== index)];
    onChange(reordered);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5 gap-2">
        <label htmlFor={inputId} className="block text-xs font-semibold text-slate-700">
          {t.productForm.photos}
        </label>
        <span className="text-xs text-slate-500">
          {interpolate(t.productForm.photosHint, {
            count: photos.length,
            max: maxAllowed,
          })}
        </span>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          void processFiles(e.dataTransfer.files);
        }}
        className={`rounded-lg border-2 border-dashed p-4 transition-colors ${
          isDragging
            ? 'border-blue-600 bg-blue-50/70'
            : 'border-slate-300 bg-slate-50/60 hover:border-slate-400'
        }`}
      >
        <input
          ref={fileInputRef}
          id={inputId}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(e) => void processFiles(e.target.files)}
        />

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" aria-hidden="true" />
              ) : (
                <Upload className="w-4 h-4" aria-hidden="true" />
              )}
            </div>
            <div className="min-w-0 text-start">
              <p className="text-sm font-medium text-slate-800">
                {isProcessing ? t.productForm.compressingPhotos : t.productForm.dragDropPhotos}
              </p>
              <p className="text-xs text-slate-500">{t.productForm.selectMultipleHint}</p>
            </div>
          </div>

          <button
            type="button"
            disabled={isProcessing || photos.length >= maxAllowed}
            onClick={() => fileInputRef.current?.click()}
            className="h-9 px-3.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-blue-600"
          >
            {t.productForm.chooseFiles}
          </button>
        </div>

        {photos.length > 0 && (
          <div className="mt-4 grid grid-cols-4 gap-3">
            {photos.map((src, idx) => (
              <div
                key={`${idx}-${src.slice(0, 32)}`}
                className="group relative aspect-square rounded-lg border border-slate-200 bg-white overflow-hidden"
              >
                {brokenIndices[idx] ? (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-slate-400 p-2 text-center">
                    <ImageIcon className="w-5 h-5 mb-1" aria-hidden="true" />
                    <span className="text-[11px]">
                      {interpolate(t.productForm.photoFallbackLabel, { index: idx + 1 })}
                    </span>
                  </div>
                ) : (
                  <img
                    src={src}
                    alt={interpolate(t.productForm.photoAlt, { index: idx + 1 })}
                    referrerPolicy="no-referrer"
                    onError={() =>
                      setBrokenIndices((prev) => ({
                        ...prev,
                        [idx]: true,
                      }))
                    }
                    className="w-full h-full object-cover"
                  />
                )}

                {idx === 0 && (
                  <span className="absolute start-1.5 top-1.5 px-1.5 py-0.5 rounded bg-slate-900/85 text-[10px] font-semibold text-white">
                    {t.productForm.mainBadge}
                  </span>
                )}

                <div className="absolute end-1.5 top-1.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                  {idx > 0 && (
                    <button
                      type="button"
                      onClick={() => handleSetCover(idx)}
                      title={t.productForm.makeMainPhoto}
                      aria-label={interpolate(t.productForm.setMainAria, { index: idx + 1 })}
                      className="w-7 h-7 rounded-md bg-white/95 border border-slate-200 text-slate-700 hover:text-amber-600 flex items-center justify-center shadow-xs"
                    >
                      <Star className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemove(idx)}
                    title={t.productForm.removePhoto}
                    aria-label={interpolate(t.productForm.removePhotoAria, { index: idx + 1 })}
                    className="w-7 h-7 rounded-md bg-white/95 border border-slate-200 text-slate-700 hover:text-red-600 flex items-center justify-center shadow-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {uploadNotice && (
        <p role="status" className="mt-1.5 text-xs text-amber-700">
          {uploadNotice}
        </p>
      )}
    </div>
  );
}
