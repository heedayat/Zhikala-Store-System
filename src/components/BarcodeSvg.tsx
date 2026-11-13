import { useMemo } from 'react';
import { encodeCode128B } from '../utils/barcode';

interface BarcodeSvgProps {
  value: string;
  height?: number;
  className?: string;
}

export function BarcodeSvg({ value, height = 56, className = '' }: BarcodeSvgProps) {
  const encoded = useMemo(() => encodeCode128B(value), [value]);

  return (
    <div className={`inline-flex flex-col items-center bg-white ${className}`}>
      <svg
        viewBox={`0 0 ${encoded.totalWidth} ${height}`}
        className="w-full max-w-full h-auto block"
        shapeRendering="crispEdges"
        role="img"
        aria-label={`Barcode ${value}`}
      >
        <rect x="0" y="0" width={encoded.totalWidth} height={height} fill="#ffffff" />
        {encoded.bars.map((bar, idx) => (
          <rect
            key={`${bar.x}-${idx}`}
            x={bar.x}
            y={0}
            width={bar.width}
            height={height}
            fill="#0f172a"
          />
        ))}
      </svg>
      <span className="mt-1 font-mono text-xs tracking-[0.18em] text-slate-900 tabular-nums select-all">
        {value}
      </span>
    </div>
  );
}
