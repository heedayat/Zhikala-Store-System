import { useEffect, useState } from 'react';
import { PackageCheck } from 'lucide-react';
import { normalizeLogoUrl } from '../utils/formatters';

interface StoreLogoProps {
  logoUrl?: string | null;
  shopName: string;
  variant?: 'default' | 'receipt';
  className?: string;
}

export function StoreLogo({
  logoUrl,
  shopName,
  variant = 'default',
  className = '',
}: StoreLogoProps) {
  const cleanUrl = normalizeLogoUrl(logoUrl);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  useEffect(() => {
    setFailedUrl(null);
  }, [cleanUrl]);

  const showImage = Boolean(cleanUrl) && failedUrl !== cleanUrl;

  const containerStyle =
    variant === 'receipt'
      ? 'bg-slate-100 border border-slate-300 text-slate-800'
      : showImage
        ? 'bg-white border border-slate-200 text-slate-900'
        : 'bg-slate-900 text-white';

  return (
    <div
      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 overflow-hidden ${containerStyle} ${className}`}
    >
      {showImage ? (
        <img
          src={cleanUrl}
          alt={`${shopName} logo`}
          referrerPolicy="no-referrer"
          onError={() => setFailedUrl(cleanUrl)}
          className="w-full h-full object-contain p-0.5"
        />
      ) : (
        <PackageCheck className="w-5 h-5" aria-hidden="true" />
      )}
    </div>
  );
}
