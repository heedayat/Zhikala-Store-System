import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ChevronDown, Plus } from 'lucide-react';

interface CategoryComboboxProps {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  error?: string;
}

export function CategoryCombobox({
  value,
  onChange,
  suggestions,
  error,
}: CategoryComboboxProps) {
  const inputId = useId();
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return suggestions;
    return suggestions.filter((cat) => cat.toLowerCase().includes(q));
  }, [suggestions, value]);

  const exactMatch = useMemo(() => {
    const q = value.trim().toLowerCase();
    return q !== '' && suggestions.some((cat) => cat.toLowerCase() === q);
  }, [suggestions, value]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const showDropdown = isOpen && (filtered.length > 0 || (value.trim() !== '' && !exactMatch));

  return (
    <div ref={containerRef} className="relative">
      <label htmlFor={inputId} className="block text-xs font-semibold text-slate-700 mb-1.5">
        Category
      </label>
      <div className="relative">
        <input
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls={listboxId}
          aria-autocomplete="list"
          value={value}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setIsOpen(false);
            } else if (e.key === 'Enter' && showDropdown) {
              setIsOpen(false);
            }
          }}
          maxLength={80}
          placeholder="Type or choose a category (e.g. Action Figures)"
          className="w-full h-10 pl-3 pr-9 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label="Toggle category suggestions"
          onClick={() => setIsOpen((prev) => !prev)}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-md text-slate-400 hover:text-slate-700 flex items-center justify-center"
        >
          <ChevronDown className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>

      {showDropdown && (
        <div
          id={listboxId}
          role="listbox"
          className="absolute z-30 mt-1 w-full max-h-52 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg py-1"
        >
          {filtered.map((category) => (
            <button
              key={category}
              type="button"
              role="option"
              aria-selected={value.trim().toLowerCase() === category.toLowerCase()}
              onClick={() => {
                onChange(category);
                setIsOpen(false);
              }}
              className="w-full px-3 py-2 text-left text-sm text-slate-800 hover:bg-slate-100 transition-colors flex items-center justify-between"
            >
              <span className="truncate">{category}</span>
            </button>
          ))}

          {value.trim() !== '' && !exactMatch && (
            <button
              type="button"
              role="option"
              aria-selected={false}
              onClick={() => {
                onChange(value.trim());
                setIsOpen(false);
              }}
              className="w-full px-3 py-2 text-left text-sm text-blue-700 font-medium hover:bg-blue-50 transition-colors flex items-center gap-2 border-t border-slate-100"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">Use &ldquo;{value.trim()}&rdquo;</span>
            </button>
          )}
        </div>
      )}

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
